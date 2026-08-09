import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { memoryStorage } from "multer";
import { IngestionService } from "./ingestion.service";
import { ApproveDto } from "./dto/approve.dto";
import { QueryDto } from "./dto/query.dto";
import { ScheduleDto } from "./dto/schedule.dto";

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  async upload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException(
        "No file uploaded or invalid file field name",
      );
    }
    return this.ingestionService.startUpload(file);
  }

  @Get("schedule")
  async getSchedules() {
    return this.ingestionService.getSchedules();
  }

  @Post("schedule")
  async createSchedule(@Body() body: ScheduleDto) {
    return this.ingestionService.createSchedule(body);
  }

  @Delete("schedule/:id")
  async deleteSchedule(@Param("id") id: string) {
    return this.ingestionService.deleteSchedule(id);
  }

  @Post("schedule/:id/toggle")
  async toggleSchedule(@Param("id") id: string) {
    return this.ingestionService.toggleScheduleStatus(id);
  }

  @Post("schedule/:id/trigger")
  async triggerSchedule(@Param("id") id: string) {
    return this.ingestionService.triggerSchedule(id);
  }

  @Post("push/:jobId")
  async pushToAdPlatform(@Param("jobId") jobId: string) {
    return this.ingestionService.pushToAdPlatform(jobId);
  }

  @Get("validation/:jobId")
  async validation(@Param("jobId") jobId: string) {
    return this.ingestionService.getValidation(jobId);
  }

  @Get("workflow-status/:jobId")
  async workflowStatus(@Param("jobId") jobId: string) {
    return this.ingestionService.getWorkflowStatus(jobId);
  }

  @Post("approve")
  async approve(@Body() body: ApproveDto) {
    return this.ingestionService.approve(body);
  }

  @Get("reconciliation/:jobId")
  async reconciliation(@Param("jobId") jobId: string) {
    return this.ingestionService.getReconciliation(jobId);
  }

  @Post("assistant/query")
  async queryAssistant(@Body() body: QueryDto) {
    return this.ingestionService.queryAssistant(body.query);
  }

  @Get("history")
  async history() {
    return this.ingestionService.getHistory();
  }

  @Get("pipeline-status")
  async pipelineStatus() {
    return this.ingestionService.getPipelineStatus();
  }

  @Get("health")
  async health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("download/:jobId")
  async download(@Param("jobId") jobId: string, @Res() res: Response) {
    const report = this.ingestionService.getDownloadReport(jobId);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="validation-${jobId}.json"`,
    );
    res.send(report);
  }
}
