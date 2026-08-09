import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ValidationService } from "./validation.service";
import { ReconciliationService } from "./reconciliation.service";
import { AssistantService } from "./assistant.service";
import { DataWarehouseService } from "./warehouse.service";
import { IngestionJob, IngestionSchedule } from "./models/ingestion.model";
import { TemporalService } from "./temporal/temporal.service";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { ApproveDto } from "./dto/approve.dto";
const STORAGE_PATH = join(__dirname, "../../../data");
const MAX_JOBS = 500;
const MAX_HISTORY = 500;
const MAX_SCHEDULES = 100;

@Injectable()
export class IngestionModel {
  private jobs = new Map<string, IngestionJob>();
  private history: IngestionJob[] = [];
  private uploadedHashes = new Set<string>();
  private schedules: IngestionSchedule[] = [];

  constructor() {}

  async ensureStorageDir() {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  }

  addJob(jobId: string, job: IngestionJob) {
    if (this.jobs.size >= MAX_JOBS) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }
    this.jobs.set(jobId, job);

    if (this.history.length >= MAX_HISTORY) {
      this.history.shift();
    }
    this.history.push(job);
  }

  getJob(jobId: string): IngestionJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): IngestionJob[] {
    return Array.from(this.jobs.values());
  }

  addHash(hash: string) {
    if (this.uploadedHashes.size > 2000) {
      const iterator = this.uploadedHashes.values();
      for (let i = 0; i < 1000; i++) {
        const val = iterator.next().value;
        if (val) this.uploadedHashes.delete(val);
      }
    }
    this.uploadedHashes.add(hash);
  }

  hasHash(hash: string): boolean {
    return this.uploadedHashes.has(hash);
  }

  addSchedule(schedule: IngestionSchedule) {
    if (this.schedules.length >= MAX_SCHEDULES) {
      this.schedules.shift();
    }
    this.schedules.push(schedule);
  }

  getHistory(): IngestionJob[] {
    return this.history;
  }
}

@Injectable()
export class IngestionService {
  constructor(
    private readonly validationService: ValidationService,
    private readonly reconciliationService: ReconciliationService,
    private readonly assistantService: AssistantService,
    private readonly dataWarehouseService: DataWarehouseService,
    private readonly modelInstance: IngestionModel,
    private readonly temporalService: TemporalService,
  ) {}

  async startUpload(file: any) {
    await this.modelInstance.ensureStorageDir();

    const validation = await this.validationService.validateFile(
      file.buffer,
      file.originalname,
    );

    // Idempotency check: prevent duplicate ingestion if file hash already processed
    if (this.modelInstance.hasHash(validation.fileHash)) {
      const existing = this.modelInstance
        .getAllJobs()
        .find((j) => j.validation.fileHash === validation.fileHash);
      if (existing) {
        return {
          ...existing,
          idempotentDuplicateNotice:
            "File with identical hash already uploaded and processed.",
        };
      }
    }

    this.modelInstance.addHash(validation.fileHash);
    const jobId = randomUUID();
    const rawFilePath = join(STORAGE_PATH, `${jobId}-${file.originalname}`);
    await fs.writeFile(rawFilePath, file.buffer);

    // Trigger Temporal Orchestration Workflow
    const workflowInfo = await this.temporalService.startIngestionWorkflow({
      jobId,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      autoApprove: false,
    });

    const hosted: IngestionJob = {
      jobId,
      fileName: file.originalname,
      rawFilePath,
      validation,
      status: "VALIDATED",
      createdAt: new Date().toISOString(),
      temporalWorkflowId: workflowInfo.workflowId,
      isTemporalNative: workflowInfo.isTemporalNative,
    };
    this.modelInstance.addJob(jobId, hosted);
    await this.assistantService.indexIngestion(hosted);

    // Persist audit trail to json file with safe error handling
    try {
      await fs.writeFile(
        join(STORAGE_PATH, `${jobId}-audit.json`),
        JSON.stringify(hosted, null, 2),
      );
    } catch (e) {
      console.warn("Failed to persist audit trail to disk:", e);
    }

    return hosted;
  }

  getValidation(jobId: string) {
    const job = this.modelInstance.getJob(jobId);
    if (!job) throw new NotFoundException("Job not found");
    return job.validation;
  }

  async approve(body: ApproveDto) {
    const job = this.modelInstance.getJob(body.jobId);
    if (!job) throw new NotFoundException("Job not found");

    // Signal Temporal Workflow about approval
    await this.temporalService.signalApproval(body.jobId, {
      approvedBy: body.approvedBy || "unknown",
      approvedCorrections: body.approvedCorrections || [],
      notes: body.notes || "",
    });

    const cleaned = this.validationService.applyApprovals(
      job.validation,
      body.approvedCorrections || [],
    );
    const reconciliation = await this.reconciliationService.reconcile(
      cleaned.records,
      job.fileName,
    );
    job.approvedAt = new Date().toISOString();
    job.status = "APPROVED";
    job.cleanedData = cleaned.records;
    job.reconciliation = reconciliation;
    job.audit = {
      approvedBy: body.approvedBy || "unknown",
      approvedAt: job.approvedAt,
      notes: body.notes || "",
    };

    // Push approved and validated clean data to Snowflake / Databricks Data Warehouse
    try {
      const rawBuffer = await fs.readFile(job.rawFilePath);
      const dwResult = await this.dataWarehouseService.pushToWarehouse(
        body.jobId,
        job.fileName,
        rawBuffer,
        job.cleanedData || [],
        job,
      );
      job.audit.warehouse = dwResult;
    } catch (dwError) {
      console.warn(
        "Failed to push dataset to Databricks/Snowflake warehouse:",
        dwError,
      );
      job.audit.warehouseError = dwError.message;
    }

    await this.assistantService.indexIngestion(job);
    return { jobId: body.jobId, reconciliation, audit: job.audit };
  }

  getReconciliation(jobId: string) {
    const job = this.modelInstance.getJob(jobId);
    if (!job) throw new NotFoundException("Job not found");
    return job.reconciliation;
  }

  async queryAssistant(query: string) {
    return this.assistantService.query(query);
  }

  getHistory() {
    return this.modelInstance.getHistory();
  }

  getPipelineStatus() {
    return this.modelInstance.getAllJobs().map((job) => ({
      jobId: job.jobId,
      status: job.status,
      fileName: job.fileName,
      createdAt: job.createdAt,
    }));
  }

  getDownloadReport(jobId: string) {
    const job = this.modelInstance.getJob(jobId);
    if (!job) throw new NotFoundException("Job not found");
    return {
      jobId,
      fileName: job.fileName,
      validation: job.validation,
      reconciliation: job.reconciliation || null,
      audit: job.audit || null,
    };
  }

  async getWorkflowStatus(jobId: string) {
    const job = this.modelInstance.getJob(jobId);
    if (!job) throw new NotFoundException("Job not found");
    const temporalState = await this.temporalService.getWorkflowState(jobId);
    return {
      jobId,
      jobStatus: job.status,
      temporalState: temporalState || {
        status: job.status,
        message: "No active Temporal state found",
      },
    };
  }

  createSchedule(body: any) {
    const scheduleId = randomUUID();
    const sched: IngestionSchedule = {
      scheduleId,
      ...body,
      createdAt: new Date().toISOString(),
      status: "ACTIVE",
    };
    this.modelInstance.addSchedule(sched);
    return sched;
  }

  async pushToAdPlatform(jobId: string) {
    const job = this.modelInstance.getJob(jobId);
    if (!job) throw new NotFoundException("Job not found");
    if (job.status !== "APPROVED") {
      throw new BadRequestException(
        "Job must be approved before pushing to Ad Platform",
      );
    }
    job.status = "PUSHED_TO_AD_PLATFORM";
    job.pushedAt = new Date().toISOString();
    return {
      success: true,
      jobId,
      platform: "Google Ads / Meta Sandbox",
      pushedAt: job.pushedAt,
      recordsPushed: job.cleanedData?.length || 0,
      status: "SYNCED",
    };
  }
}
