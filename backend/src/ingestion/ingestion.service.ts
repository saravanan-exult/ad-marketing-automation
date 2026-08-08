import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ValidationService } from "./validation.service";
import { ReconciliationService } from "./reconciliation.service";
import { AssistantService } from "./assistant.service";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { ApproveDto } from "./dto/approve.dto";
const STORAGE_PATH = join(__dirname, "../../data");

@Injectable()
export class IngestionService {
  private jobs = new Map<string, any>();
  private history = [] as any[];

  constructor(
    private readonly validationService: ValidationService,
    private readonly reconciliationService: ReconciliationService,
    private readonly assistantService: AssistantService,
  ) {}

  async startUpload(file: any) {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
    const jobId = randomUUID();
    const rawFilePath = join(STORAGE_PATH, `${jobId}-${file.originalname}`);
    await fs.writeFile(rawFilePath, file.buffer);

    const validation = await this.validationService.validateFile(
      file.buffer,
      file.originalname,
    );
    const hosted = {
      jobId,
      fileName: file.originalname,
      rawFilePath,
      validation,
      status: "VALIDATED",
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, hosted);
    this.history.push(hosted);
    this.assistantService.indexIngestion(hosted);
    return hosted;
  }

  getValidation(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException("Job not found");
    return job.validation;
  }

  async approve(body: ApproveDto) {
    const job = this.jobs.get(body.jobId);
    if (!job) throw new NotFoundException("Job not found");
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
    this.assistantService.indexIngestion(job);
    return { jobId: body.jobId, reconciliation, audit: job.audit };
  }

  getReconciliation(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException("Job not found");
    return job.reconciliation;
  }

  async queryAssistant(query: string) {
    return this.assistantService.query(query);
  }

  getHistory() {
    return this.history;
  }

  getPipelineStatus() {
    return Array.from(this.jobs.values()).map((job) => ({
      jobId: job.jobId,
      status: job.status,
      fileName: job.fileName,
      createdAt: job.createdAt,
    }));
  }

  getDownloadReport(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException("Job not found");
    return {
      jobId,
      fileName: job.fileName,
      validation: job.validation,
      reconciliation: job.reconciliation || null,
      audit: job.audit || null,
    };
  }

  private schedules = [] as any[];

  createSchedule(body: any) {
    const scheduleId = randomUUID();
    const sched = {
      scheduleId,
      ...body,
      createdAt: new Date().toISOString(),
      status: "ACTIVE",
    };
    this.schedules.push(sched);
    return sched;
  }

  async pushToAdPlatform(jobId: string) {
    const job = this.jobs.get(jobId);
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
