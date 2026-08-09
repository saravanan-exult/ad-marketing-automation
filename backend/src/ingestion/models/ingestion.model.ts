import { ValidationResult, CampaignRecord } from "../types";

export { ValidationResult, CampaignRecord };

export interface IngestionJob {
  jobId: string;
  fileName: string;
  rawFilePath: string;
  validation: ValidationResult;
  status: "VALIDATED" | "APPROVED" | "PUSHED_TO_AD_PLATFORM" | "FAILED";
  createdAt: string;
  approvedAt?: string;
  pushedAt?: string;
  cleanedData?: CampaignRecord[];
  reconciliation?: any;
  temporalWorkflowId?: string;
  isTemporalNative?: boolean;
  audit?: {
    approvedBy: string;
    approvedAt: string;
    notes: string;
    warehouse?: any;
    warehouseError?: string;
  };
}

export interface IngestionSchedule {
  scheduleId: string;
  frequency: string;
  source: string;
  createdAt: string;
  status: "ACTIVE" | "PAUSED";
}
