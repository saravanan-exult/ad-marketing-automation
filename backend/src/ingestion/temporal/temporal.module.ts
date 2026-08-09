import { Module } from "@nestjs/common";
import { TemporalService } from "./temporal.service";
import { TemporalWorkerService } from "./temporal.worker";
import { IngestionActivitiesService } from "./ingestion.activities";
import { ValidationService } from "../validation.service";
import { ReconciliationService } from "../reconciliation.service";
import { AssistantService } from "../assistant.service";
import { DataWarehouseService } from "../warehouse.service";
import { IngestionModel } from "../ingestion.service";
import { VectorStoreService } from "../vector-store.service";

@Module({
  providers: [
    TemporalService,
    TemporalWorkerService,
    IngestionActivitiesService,
    ValidationService,
    ReconciliationService,
    AssistantService,
    DataWarehouseService,
    IngestionModel,
    VectorStoreService,
  ],
  exports: [TemporalService, TemporalWorkerService, IngestionActivitiesService],
})
export class TemporalModule {}
