import { Injectable } from "@nestjs/common";
import { ValidationService } from "../validation.service";
import { ReconciliationService } from "../reconciliation.service";
import { AssistantService } from "../assistant.service";
import { DataWarehouseService } from "../warehouse.service";

export interface ValidateFileInput {
  fileBase64: string;
  fileName: string;
}

export interface ReconcileInput {
  records: any[];
  fileName: string;
}

export interface PushWarehouseInput {
  jobId: string;
  fileName: string;
  rawBase64: string;
  cleanedData: any[];
  job: any;
}

export interface PushAdPlatformInput {
  jobId: string;
  campaignData: any[];
  platform?: string;
}

export interface NotificationInput {
  channel?: string;
  type: "SUCCESS" | "FAILURE" | "WARNING";
  message: string;
  details?: any;
  webhookUrl?: string;
  email?: string;
}

@Injectable()
export class IngestionActivitiesService {
  constructor(
    private readonly validationService: ValidationService,
    private readonly reconciliationService: ReconciliationService,
    private readonly assistantService: AssistantService,
    private readonly dataWarehouseService: DataWarehouseService,
  ) {}

  async validateFileActivity(input: ValidateFileInput) {
    const buffer = Buffer.from(input.fileBase64, "base64");
    const result = await this.validationService.validateFile(
      buffer,
      input.fileName,
    );
    return result;
  }

  async indexIngestionActivity(jobData: any) {
    await this.assistantService.indexIngestion(jobData);
    return { indexed: true, timestamp: new Date().toISOString() };
  }

  async reconcileSpendActivity(input: ReconcileInput) {
    const report = await this.reconciliationService.reconcile(
      input.records,
      input.fileName,
    );
    return report;
  }

  async pushToWarehouseActivity(input: PushWarehouseInput) {
    const rawBuffer = Buffer.from(input.rawBase64, "base64");
    const dwResult = await this.dataWarehouseService.pushToWarehouse(
      input.jobId,
      input.fileName,
      rawBuffer,
      input.cleanedData,
      input.job,
    );
    return dwResult;
  }

  async pushToAdPlatformActivity(input: PushAdPlatformInput) {
    // Stub or call Ad platform API push logic with retries
    return {
      pushed: true,
      jobId: input.jobId,
      platform: input.platform || "Google/Meta/Amazon",
      pushedAt: new Date().toISOString(),
      recordCount: input.campaignData.length,
      status: "SYNCED_TO_AD_TECH_PLATFORM",
    };
  }

  async sendNotificationActivity(input: NotificationInput) {
    const timestamp = new Date().toISOString();
    console.log(
      `[Temporal Activity Notification] [${input.type}] ${input.message} | Email: ${
        input.email || "N/A"
      } | Webhook: ${input.webhookUrl || "N/A"}`,
    );

    if (input.webhookUrl && input.webhookUrl.startsWith("http")) {
      try {
        await fetch(input.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "INGESTION_NOTIFICATION",
            type: input.type,
            message: input.message,
            details: input.details,
            timestamp,
          }),
        });
      } catch (err: any) {
        console.error(
          `Failed to send webhook to ${input.webhookUrl}:`,
          err.message,
        );
      }
    }

    return {
      delivered: true,
      type: input.type,
      channel:
        input.channel ||
        (input.webhookUrl ? "webhook" : input.email ? "email" : "console"),
      emailSentTo: input.email,
      webhookDispatchedTo: input.webhookUrl,
      timestamp,
    };
  }
}
