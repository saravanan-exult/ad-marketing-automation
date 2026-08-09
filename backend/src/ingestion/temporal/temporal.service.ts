import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Connection, Client, WorkflowHandle } from "@temporalio/client";
import {
  ingestionWorkflow,
  approveSignal,
  getStateQuery,
  IngestionWorkflowState,
  ApprovalPayload,
} from "./ingestion.workflows";
import { IngestionActivitiesService } from "./ingestion.activities";

export const TASK_QUEUE_NAME = "marketing-ingestion-task-queue";

@Injectable()
export class TemporalService implements OnModuleInit {
  private readonly logger = new Logger(TemporalService.name);
  private client: Client | null = null;
  private isConnected = false;
  private fallbackStateMap = new Map<string, IngestionWorkflowState>();

  constructor(
    @Inject(forwardRef(() => IngestionActivitiesService))
    private readonly activitiesService: IngestionActivitiesService,
  ) {}

  async onModuleInit() {
    await this.connectClient();
  }

  private async connectClient(): Promise<boolean> {
    if (this.isConnected && this.client) return true;

    const address = process.env.TEMPORAL_HOST || "localhost:7233";
    try {
      this.logger.log(
        `Attempting connection to Temporal Server at ${address}...`,
      );
      const connection = await Connection.connect({ address });
      this.client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || "default",
      });
      this.isConnected = true;
      this.logger.log(
        `Successfully connected to Temporal Server at ${address}`,
      );
      return true;
    } catch (err: any) {
      this.logger.warn(
        `Could not connect to Temporal Server (${address}): ${err?.message}. Operating in hybrid standalone mode with internal workflow engine.`,
      );
      this.isConnected = false;
      this.client = null;
      return false;
    }
  }

  isTemporalConnected(): boolean {
    return this.isConnected;
  }

  async startIngestionWorkflow(params: {
    jobId: string;
    fileBuffer: Buffer;
    fileName: string;
    autoApprove?: boolean;
    approvedBy?: string;
  }): Promise<{ workflowId: string; isTemporalNative: boolean }> {
    const workflowId = `ingestion-workflow-${params.jobId}`;
    const fileBase64 = params.fileBuffer.toString("base64");

    const connected = await this.connectClient();

    if (connected && this.client) {
      try {
        const handle = await this.client.workflow.start(ingestionWorkflow, {
          taskQueue: TASK_QUEUE_NAME,
          workflowId,
          args: [
            {
              jobId: params.jobId,
              fileBase64,
              fileName: params.fileName,
              autoApprove: params.autoApprove,
              approvedBy: params.approvedBy,
            },
          ],
        });
        this.logger.log(
          `Started Temporal Workflow natively: ID=${handle.workflowId}, RunID=${handle.firstExecutionRunId}`,
        );
        return { workflowId, isTemporalNative: true };
      } catch (e: any) {
        this.logger.warn(
          `Failed to start Temporal native workflow (${e?.message}). Falling back to internal engine.`,
        );
      }
    }

    // Hybrid Fallback execution engine
    this.runFallbackWorkflow(
      params.jobId,
      fileBase64,
      params.fileName,
      params.autoApprove,
      params.approvedBy,
    );
    return { workflowId, isTemporalNative: false };
  }

  async signalApproval(
    jobId: string,
    approvalData: ApprovalPayload,
  ): Promise<boolean> {
    const workflowId = `ingestion-workflow-${jobId}`;
    const connected = await this.connectClient();

    if (connected && this.client) {
      try {
        const handle = this.client.workflow.getHandle(workflowId);
        await handle.signal(approveSignal, approvalData);
        this.logger.log(
          `Signaled Temporal workflow ${workflowId} with approval.`,
        );
        return true;
      } catch (e: any) {
        this.logger.warn(
          `Failed to signal Temporal native workflow: ${e?.message}`,
        );
      }
    }

    // Fallback in-memory workflow signaling
    const state = this.fallbackStateMap.get(workflowId);
    if (state) {
      state.approvalData = approvalData;
      state.status = "APPROVED";
      state.updatedAt = new Date().toISOString();
      this.logger.log(
        `Signaled fallback workflow ${workflowId} with approval.`,
      );
      return true;
    }
    return false;
  }

  async getWorkflowState(
    jobId: string,
  ): Promise<IngestionWorkflowState | null> {
    const workflowId = `ingestion-workflow-${jobId}`;
    const connected = await this.connectClient();

    if (connected && this.client) {
      try {
        const handle = this.client.workflow.getHandle(workflowId);
        const state = await handle.query(getStateQuery);
        return state;
      } catch (e: any) {
        this.logger.warn(
          `Could not query Temporal native workflow (${e?.message}). Checking fallback map.`,
        );
      }
    }

    return this.fallbackStateMap.get(workflowId) || null;
  }

  private async runFallbackWorkflow(
    jobId: string,
    fileBase64: string,
    fileName: string,
    autoApprove?: boolean,
    approvedBy?: string,
  ) {
    const workflowId = `ingestion-workflow-${jobId}`;
    const state: IngestionWorkflowState = {
      jobId,
      fileName,
      status: "VALIDATING",
      updatedAt: new Date().toISOString(),
    };
    this.fallbackStateMap.set(workflowId, state);

    try {
      // Step 1: Validation
      const validation = await this.activitiesService.validateFileActivity({
        fileBase64,
        fileName,
      });
      state.validationResult = validation;
      state.status = "VALIDATED";
      state.updatedAt = new Date().toISOString();

      // Step 2: RAG Indexing
      await this.activitiesService.indexIngestionActivity({
        jobId,
        fileName,
        validation,
        status: state.status,
        createdAt: state.updatedAt,
      });

      if (autoApprove) {
        state.approvalData = {
          approvedBy: approvedBy || "system-auto-approve",
          approvedCorrections: [],
          notes: "Auto-approved via policy",
        };
        state.status = "APPROVED";
        state.updatedAt = new Date().toISOString();

        const records = validation.records || [];
        const reconciliation =
          await this.activitiesService.reconcileSpendActivity({
            records,
            fileName,
          });
        state.reconciliationResult = reconciliation;

        const warehouseRes =
          await this.activitiesService.pushToWarehouseActivity({
            jobId,
            fileName,
            rawBase64: fileBase64,
            cleanedData: records,
            job: { jobId, fileName, validation, status: state.status },
          });
        state.warehouseResult = warehouseRes;

        const adPush = await this.activitiesService.pushToAdPlatformActivity({
          jobId,
          campaignData: records,
        });
        state.adPlatformResult = adPush;
        state.status = "COMPLETED";
        state.updatedAt = new Date().toISOString();
      } else {
        state.status = "WAITING_FOR_APPROVAL";
        state.updatedAt = new Date().toISOString();
      }
    } catch (err: any) {
      state.status = "FAILED";
      state.error = err?.message || String(err);
      state.updatedAt = new Date().toISOString();
    }
  }
}
