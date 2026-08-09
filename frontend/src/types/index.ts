export interface CampaignRecord {
  campaignName: string;
  date: string;
  region: string;
  spend: string;
  impressions: string;
  platform: string;
  campaignId: string;
  errors: string[];
  suggestedMatch: string | null;
  confidence: number | null;
}

export interface ValidationResult {
  fileName: string;
  totalRows: number;
  parsedRows: number;
  missingColumns: string[];
  additionalColumns: string[];
  duplicateCount: number;
  missingCount: number;
  invalidDateCount: number;
  invalidCategoryCount: number;
  qualityScore: number;
  summary: string;
  records: CampaignRecord[];
}

export interface ReconciliationItem {
  campaignId: string;
  campaignName: string;
  uploadedSpend: number;
  platformSpend: number;
  variance: number;
  status: "MATCH" | "REVIEW";
}

export interface ReconciliationResult {
  jobId: string;
  threshold: number;
  totalRecords: number;
  averageVariance: number;
  results: ReconciliationItem[];
}

export interface PipelineJob {
  jobId: string;
  fileName: string;
  status: string;
  createdAt: string;
}

export interface AuditHistoryItem {
  jobId: string;
  fileName: string;
  validation: ValidationResult;
  status: string;
  audit?: {
    approvedBy: string;
    notes: string;
    approvedAt: string;
  };
}

export interface AssistantSource {
  jobId: string;
  fileName: string;
}

export interface AssistantResult {
  answer: string;
  sources: AssistantSource[];
}

export interface ScheduleItem {
  scheduleId: string;
  sourceName: string;
  frequency: "HOURLY" | "DAILY" | "WEEKLY" | "MANUAL";
  executionTime?: string;
  notificationEmail?: string;
  notificationWebhook?: string;
  enabled: boolean;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

export type AppStep =
  | "upload"
  | "review"
  | "reconciliation"
  | "scheduling"
  | "dashboard"
  | "assistant";
