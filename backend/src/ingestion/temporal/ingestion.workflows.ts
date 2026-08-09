import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
} from "@temporalio/workflow";
import type { IngestionActivitiesService } from "./ingestion.activities";

const {
  validateFileActivity,
  indexIngestionActivity,
  reconcileSpendActivity,
  pushToWarehouseActivity,
  pushToAdPlatformActivity,
  sendNotificationActivity,
} = proxyActivities<IngestionActivitiesService>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
    maximumAttempts: 5,
  },
});

export interface IngestionWorkflowParams {
  jobId: string;
  fileBase64: string;
  fileName: string;
  autoApprove?: boolean;
  approvedBy?: string;
}

export interface ApprovalPayload {
  approvedBy: string;
  approvedCorrections?: any[];
  notes?: string;
}

export interface IngestionWorkflowState {
  jobId: string;
  fileName: string;
  status:
    | "INITIALIZED"
    | "VALIDATING"
    | "VALIDATED"
    | "WAITING_FOR_APPROVAL"
    | "APPROVED"
    | "RECONCILING"
    | "WAREHOUSE_PUSHED"
    | "AD_PLATFORM_PUSHED"
    | "COMPLETED"
    | "FAILED";
  validationResult?: any;
  approvalData?: ApprovalPayload;
  reconciliationResult?: any;
  warehouseResult?: any;
  adPlatformResult?: any;
  error?: string;
  updatedAt: string;
}

export const approveSignal = defineSignal<[ApprovalPayload]>("approveSignal");
export const getStateQuery = defineQuery<IngestionWorkflowState>("getState");

export async function ingestionWorkflow(
  params: IngestionWorkflowParams,
): Promise<IngestionWorkflowState> {
  let state: IngestionWorkflowState = {
    jobId: params.jobId,
    fileName: params.fileName,
    status: "INITIALIZED",
    updatedAt: new Date().toISOString(),
  };

  setHandler(getStateQuery, () => state);

  let approvalReceived: ApprovalPayload | null = params.autoApprove
    ? {
        approvedBy: params.approvedBy || "system-auto-approve",
        approvedCorrections: [],
        notes: "Auto-approved via workflow policy",
      }
    : null;

  setHandler(approveSignal, (payload: ApprovalPayload) => {
    approvalReceived = payload;
  });

  try {
    // Step 1: File Validation & Quality Analysis
    state.status = "VALIDATING";
    state.updatedAt = new Date().toISOString();

    const validationResult = await validateFileActivity({
      fileBase64: params.fileBase64,
      fileName: params.fileName,
    });
    state.validationResult = validationResult;
    state.status = "VALIDATED";
    state.updatedAt = new Date().toISOString();

    // Step 2: Index validation log into RAG assistant vector store
    await indexIngestionActivity({
      jobId: params.jobId,
      fileName: params.fileName,
      validation: validationResult,
      status: state.status,
      createdAt: state.updatedAt,
    });

    // Step 3: Human-in-the-loop Approval Signal Wait
    if (!approvalReceived) {
      state.status = "WAITING_FOR_APPROVAL";
      state.updatedAt = new Date().toISOString();

      // Wait up to 7 days for review signal
      const signalApproved = await condition(
        () => approvalReceived !== null,
        "7 days",
      );

      if (!signalApproved || !approvalReceived) {
        state.status = "FAILED";
        state.error = "Approval timed out after 7 days";
        state.updatedAt = new Date().toISOString();
        await sendNotificationActivity({
          type: "FAILURE",
          message: `Ingestion job ${params.jobId} timed out waiting for approval.`,
          details: { jobId: params.jobId, fileName: params.fileName },
        });
        return state;
      }
    }

    state.approvalData = approvalReceived;
    state.status = "APPROVED";
    state.updatedAt = new Date().toISOString();

    // Step 4: Ad Tech Platform Reconciliation
    state.status = "RECONCILING";
    state.updatedAt = new Date().toISOString();

    const recordsToReconcile = validationResult.records || [];
    const reconciliation = await reconcileSpendActivity({
      records: recordsToReconcile,
      fileName: params.fileName,
    });
    state.reconciliationResult = reconciliation;

    // Step 5: Databricks / Snowflake Warehouse Ingestion
    const warehouseRes = await pushToWarehouseActivity({
      jobId: params.jobId,
      fileName: params.fileName,
      rawBase64: params.fileBase64,
      cleanedData: recordsToReconcile,
      job: {
        jobId: params.jobId,
        fileName: params.fileName,
        validation: validationResult,
        status: state.status,
      },
    });
    state.warehouseResult = warehouseRes;
    state.status = "WAREHOUSE_PUSHED";
    state.updatedAt = new Date().toISOString();

    // Step 6: Ad Tech Platform Push
    const adPushRes = await pushToAdPlatformActivity({
      jobId: params.jobId,
      campaignData: recordsToReconcile,
    });
    state.adPlatformResult = adPushRes;
    state.status = "AD_PLATFORM_PUSHED";
    state.updatedAt = new Date().toISOString();

    // Final Completion Step
    state.status = "COMPLETED";
    state.updatedAt = new Date().toISOString();

    await sendNotificationActivity({
      type: "SUCCESS",
      message: `Ingestion job ${params.jobId} successfully completed full pipeline!`,
      details: {
        jobId: params.jobId,
        fileName: params.fileName,
        warehouseResult: warehouseRes,
        reconciliationScore: reconciliation.averageVariance,
      },
    });

    return state;
  } catch (err: any) {
    state.status = "FAILED";
    state.error = err?.message || String(err);
    state.updatedAt = new Date().toISOString();

    await sendNotificationActivity({
      type: "FAILURE",
      message: `Ingestion workflow ${params.jobId} failed: ${state.error}`,
      details: {
        jobId: params.jobId,
        fileName: params.fileName,
        error: state.error,
      },
    });

    return state;
  }
}
