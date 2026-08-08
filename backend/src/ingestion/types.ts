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
  records: CampaignRecord[];
  qualityScore: number;
  summary: string;
  fileHash: string;
}
