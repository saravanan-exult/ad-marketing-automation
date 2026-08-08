import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class ScheduleDto {
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @IsString()
  @IsNotEmpty()
  frequency: string; // 'hourly' | 'daily' | 'weekly'

  @IsOptional()
  @IsString()
  notificationWebhook?: string;
}
