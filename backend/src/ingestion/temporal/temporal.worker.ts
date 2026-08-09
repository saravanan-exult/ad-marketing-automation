import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { Worker, NativeConnection } from "@temporalio/worker";
import { IngestionActivitiesService } from "./ingestion.activities";
import { TASK_QUEUE_NAME } from "./temporal.service";

@Injectable()
export class TemporalWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalWorkerService.name);
  private worker: Worker | null = null;

  constructor(private readonly activitiesService: IngestionActivitiesService) {}

  async onModuleInit() {
    await this.startWorker();
  }

  async onModuleDestroy() {
    if (this.worker) {
      this.logger.log("Shutting down Temporal Worker...");
      await this.worker.shutdown();
    }
  }

  async startWorker() {
    const shouldSkipTemporal =
      process.env.NODE_ENV === "test" ||
      process.env.JEST_WORKER_ID !== undefined ||
      process.env.DISABLE_TEMPORAL === "true";

    if (shouldSkipTemporal) {
      this.logger.log("Skipping Temporal worker startup in test environment.");
      return;
    }

    const address = process.env.TEMPORAL_HOST || "localhost:7233";
    try {
      this.logger.log(
        `Initializing Temporal Worker for server at ${address}...`,
      );
      const connection = await NativeConnection.connect({ address });

      this.worker = await Worker.create({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || "default",
        taskQueue: TASK_QUEUE_NAME,
        workflowsPath: require.resolve("./ingestion.workflows"),
        activities: {
          validateFileActivity: (args) =>
            this.activitiesService.validateFileActivity(args),
          indexIngestionActivity: (args) =>
            this.activitiesService.indexIngestionActivity(args),
          reconcileSpendActivity: (args) =>
            this.activitiesService.reconcileSpendActivity(args),
          pushToWarehouseActivity: (args) =>
            this.activitiesService.pushToWarehouseActivity(args),
          pushToAdPlatformActivity: (args) =>
            this.activitiesService.pushToAdPlatformActivity(args),
          sendNotificationActivity: (args) =>
            this.activitiesService.sendNotificationActivity(args),
        },
      });

      this.logger.log(
        `Temporal Worker successfully created for Task Queue: '${TASK_QUEUE_NAME}'`,
      );

      // Run worker in background without blocking NestJS initialization
      this.worker.run().catch((err) => {
        this.logger.warn(`Temporal Worker stopped running: ${err?.message}`);
      });
    } catch (e: any) {
      this.logger.warn(
        `Temporal Worker could not start automatically (${e?.message}). Service will continue in standalone mode.`,
      );
    }
  }
}
