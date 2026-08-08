import { Injectable } from "@nestjs/common";
import { CampaignRecord } from "./types";

const PLATFORM_SPEND = {
  Google: 12400,
  Meta: 9100,
  Amazon: 5000,
  Adobe: 13000,
};

@Injectable()
export class ReconciliationService {
  async reconcile(records: CampaignRecord[], fileName: string) {
    const matched = [] as any[];
    let totalVariance = 0;
    for (const record of records) {
      const expectedSpend =
        PLATFORM_SPEND[record.platform as keyof typeof PLATFORM_SPEND] || 0;
      const actualSpend =
        parseFloat(record.spend.toString().replace(/[^0-9.-]+/g, "")) || 0;
      const variance =
        expectedSpend === 0
          ? 100
          : (Math.abs(actualSpend - expectedSpend) / (expectedSpend || 1)) *
            100;
      matched.push({
        campaignId: record.campaignId,
        campaignName: record.campaignName,
        uploadedSpend: actualSpend,
        platformSpend: expectedSpend,
        variance: parseFloat(variance.toFixed(2)),
        status: variance > 5 ? "REVIEW" : "MATCH",
      });
      totalVariance += variance;
    }
    const averageVariance =
      records.length === 0
        ? 0
        : parseFloat((totalVariance / records.length).toFixed(2));
    return {
      fileName,
      totalRecords: records.length,
      averageVariance,
      results: matched,
      threshold: 5,
    };
  }
}
