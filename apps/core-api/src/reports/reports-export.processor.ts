import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ExportJobStatus } from '@prisma/client';
import { REPORT_EXPORT_QUEUE_NAME, REPORT_EXPORT_STALE_PENDING_MS } from '../common';
import { REDIS_CONNECTION } from '../queues/tokens';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import {
  REPORT_EXPORT_JOB_NAME,
  type ContestExportJobPayload,
} from './reports-export.types';

@Injectable()
export class ReportsExportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportsExportProcessor.name);
  private worker: Worker<ContestExportJobPayload> | null = null;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  async onModuleInit() {
    await this.recoverStalePendingExports();

    this.worker = new Worker<ContestExportJobPayload>(
      REPORT_EXPORT_QUEUE_NAME,
      async (job) => {
        const { exportId, contestId, requestedById } = job.data;
        this.logger.log(`Processing contest export ${exportId}`);
        await this.reports.runContestExportJob(exportId, contestId, requestedById);
      },
      {
        connection: this.redis,
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Export job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Report export BullMQ worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  /** Re-queue hoặc fail các export PENDING khi server restart giữa chừng. */
  private async recoverStalePendingExports() {
    const cutoff = new Date(Date.now() - REPORT_EXPORT_STALE_PENDING_MS);
    const stale = await this.prisma.reportExport.findMany({
      where: { status: ExportJobStatus.PENDING, createdAt: { lt: cutoff } },
      select: { id: true, contestId: true, requestedById: true, createdAt: true },
    });

    for (const row of stale) {
      try {
        await this.reports.enqueueContestExportJob({
          exportId: row.id,
          contestId: row.contestId,
          requestedById: row.requestedById,
        });
        this.logger.warn(`Re-queued stale export ${row.id}`);
      } catch (err) {
        await this.prisma.reportExport.update({
          where: { id: row.id },
          data: {
            status: ExportJobStatus.FAILED,
            errorMessage: 'Export timed out (server restarted)',
            completedAt: new Date(),
          },
        });
      }
    }
  }
}
