import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { IngestionService, IngestionModel } from "./ingestion.service";
import { ValidationService } from "./validation.service";
import { ReconciliationService } from "./reconciliation.service";
import { AssistantService } from "./assistant.service";
import { DataWarehouseService } from "./warehouse.service";
import { VectorStoreService } from "./vector-store.service";
import { TemporalModule } from "./temporal/temporal.module";

@Module({
  imports: [TemporalModule],
  controllers: [IngestionController],
  providers: [
    IngestionModel,
    IngestionService,
    ValidationService,
    ReconciliationService,
    AssistantService,
    DataWarehouseService,
    VectorStoreService,
  ],
})
export class IngestionModule {}
