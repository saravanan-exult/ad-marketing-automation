import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";

export class ScheduleDto {
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @IsString()
  @IsNotEmpty()
  frequency: string; // 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL'

  @IsOptional()
  @IsString()
  executionTime?: string; // e.g. '07:00 AM'

  @IsOptional()
  @IsString()
  notificationEmail?: string;

  @IsOptional()
  @IsString()
  notificationWebhook?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
