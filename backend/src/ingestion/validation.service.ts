import { BadRequestException, Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { CampaignRecord, ValidationResult } from "./types";
import { fuzzyMatchCampaignName, normalizeCategory } from "./utils";
import { createHash } from "crypto";
import * as XLSX from "xlsx";

const EXPECTED_COLUMNS = [
  "Campaign Name",
  "Date",
  "Region",
  "Spend",
  "Impressions",
  "Platform",
  "Campaign ID",
];
const VALID_REGIONS = ["APAC", "EMEA", "NA", "LATAM"];
const VALID_PLATFORMS = ["Google", "Meta", "Amazon", "Adobe"];

@Injectable()
export class ValidationService {
  async validateFile(
    buffer: Buffer,
    fileName: string,
  ): Promise<ValidationResult> {
    const rows = this.parseRows(buffer, fileName);
    const header = rows.length > 0 ? Object.keys(rows[0]) : [];
    const missingColumns = EXPECTED_COLUMNS.filter(
      (col) => !header.includes(col),
    );
    const additionalColumns = header.filter(
      (col) => !EXPECTED_COLUMNS.includes(col),
    );
    const duplicates = new Set<string>();
    const ids = new Set<string>();
    const records: CampaignRecord[] = [];
    const issues = [] as string[];
    let duplicateCount = 0;
    let missingCount = 0;
    let invalidDateCount = 0;
    let invalidCategoryCount = 0;

    for (const row of rows) {
      const campaignId = row["Campaign ID"]?.trim() || "";
      const rowKey = JSON.stringify(row);
      if (duplicates.has(rowKey)) {
        duplicateCount += 1;
        continue;
      }
      duplicates.add(rowKey);
      const record: CampaignRecord = {
        campaignName: row["Campaign Name"]?.trim() || "",
        date: row["Date"]?.trim() || "",
        region: row["Region"]?.trim() || "",
        spend: row["Spend"]?.trim() || "",
        impressions: row["Impressions"]?.trim() || "",
        platform: row["Platform"]?.trim() || "",
        campaignId,
        errors: [],
        suggestedMatch: null,
        confidence: null,
      };
      if (
        !record.campaignName ||
        !record.date ||
        !record.region ||
        !record.spend ||
        !record.impressions ||
        !record.platform ||
        !record.campaignId
      ) {
        missingCount += 1;
        record.errors.push("Missing required value");
      }
      const parsedDate = this.parseDate(record.date);
      if (!parsedDate) {
        invalidDateCount += 1;
        record.errors.push("Invalid date");
      } else {
        record.date = parsedDate;
      }
      record.region = normalizeCategory(record.region);
      if (!VALID_REGIONS.includes(record.region)) {
        invalidCategoryCount += 1;
        record.errors.push(`Invalid region: ${row["Region"]}`);
      }
      record.platform = normalizeCategory(record.platform);
      if (!VALID_PLATFORMS.includes(record.platform)) {
        invalidCategoryCount += 1;
        record.errors.push(`Invalid platform: ${row["Platform"]}`);
      }
      if (ids.has(campaignId)) {
        duplicateCount += 1;
        record.errors.push("Duplicate campaign ID");
      }
      ids.add(campaignId);
      const floatSpend = parseFloat(record.spend.replace(/[^0-9.-]+/g, ""));
      const intImpressions = parseInt(
        record.impressions.replace(/[^0-9]+/g, ""),
        10,
      );
      if (Number.isNaN(floatSpend) || floatSpend < 0) {
        record.errors.push("Invalid spend");
      }
      if (Number.isNaN(intImpressions) || intImpressions < 0) {
        record.errors.push("Invalid impressions");
      }
      const match = fuzzyMatchCampaignName(record.campaignName);
      if (match.confidence >= 0.8) {
        record.suggestedMatch = match.match;
        record.confidence = Math.round(match.confidence * 100);
      }
      records.push(record);
    }

    const qualityScore =
      100 -
      Math.min(
        100,
        duplicateCount * 5 +
          missingCount * 3 +
          invalidCategoryCount * 4 +
          invalidDateCount * 2,
      );
    const summary = `Parsed ${records.length} rows. ${duplicateCount} duplicates removed. ${missingCount} missing values. ${invalidCategoryCount} invalid categories. File quality score: ${qualityScore}%.`;
    const validation: ValidationResult = {
      fileName,
      totalRows: rows.length,
      parsedRows: records.length,
      missingColumns,
      additionalColumns,
      duplicateCount,
      missingCount,
      invalidDateCount,
      invalidCategoryCount,
      records,
      qualityScore,
      summary,
      fileHash: createHash("sha256").update(buffer).digest("hex"),
    };
    return validation;
  }

  parseRows(buffer: Buffer, fileName: string) {
    const normalizedName = fileName.toLowerCase();
    if (normalizedName.endsWith(".xlsx") || normalizedName.endsWith(".xls")) {
      return this.parseExcel(buffer);
    }
    const text = buffer.toString("utf8");
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  parseExcel(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return [];
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      }) as Array<Record<string, unknown>>;
      return rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            value == null ? "" : String(value),
          ]),
        ),
      );
    } catch (error) {
      throw new BadRequestException(
        "Unable to parse Excel file. Upload a valid CSV or Excel file.",
      );
    }
  }

  parseDate(value: string) {
    const iso = value.trim();
    const patterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}-\d{2}-\d{4}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
    ];
    for (const pattern of patterns) {
      if (pattern.test(iso)) {
        const normalized = iso.replace(/\//g, "-");
        const date = new Date(normalized);
        if (!Number.isNaN(date.valueOf())) {
          return date.toISOString().slice(0, 10);
        }
      }
    }
    return null;
  }

  applyApprovals(validation: ValidationResult, approvals: any[]) {
    const records = validation.records.map((record) => {
      const approval = approvals.find(
        (a) => a.campaignId === record.campaignId,
      );
      if (!approval) return record;
      return {
        ...record,
        ...approval.updates,
        errors: record.errors.filter(
          (e) => !approval.removedErrors?.includes(e),
        ),
      };
    });
    return { ...validation, records };
  }
}
