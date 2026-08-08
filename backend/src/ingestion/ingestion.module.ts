import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { IngestionService } from "./ingestion.service";
import { ValidationService } from "./validation.service";
import { ReconciliationService } from "./reconciliation.service";
import { AssistantService } from "./assistant.service";

@Module({
  controllers: [IngestionController],
  providers: [
    IngestionService,
    ValidationService,
    ReconciliationService,
    AssistantService,
  ],
})
export class IngestionModule {}
