import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

class ApprovalItem {
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  updates: Record<string, any>;

  removedErrors?: string[];
}

export class ApproveDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalItem)
  @IsOptional()
  approvedCorrections?: ApprovalItem[];
}
