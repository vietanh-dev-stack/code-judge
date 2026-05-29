import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExportJobStatus } from '@prisma/client';
import { REPORT_EXPORT_RETENTION_MS } from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReportsCleanupCron {
  private readonly logger = new Logger(ReportsCleanupCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Xóa file XLSX export cũ trên MinIO (giữ bản ghi DB để audit). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldExportFiles() {
    const cutoff = new Date(Date.now() - REPORT_EXPORT_RETENTION_MS);
    const rows = await this.prisma.reportExport.findMany({
      where: {
        status: ExportJobStatus.DONE,
        completedAt: { lt: cutoff },
        fileObjectKey: { not: null },
      },
      select: { id: true, fileObjectKey: true },
      take: 200,
    });

    let removed = 0;
    for (const row of rows) {
      if (!row.fileObjectKey) continue;
      try {
        await this.storage.removeObject(row.fileObjectKey);
        await this.prisma.reportExport.update({
          where: { id: row.id },
          data: { fileObjectKey: null, fileUrl: null },
        });
        removed++;
      } catch (err) {
        this.logger.warn(`Failed to remove export object ${row.fileObjectKey}: ${err}`);
      }
    }

    if (removed > 0) {
      this.logger.log(`Purged ${removed} expired report export file(s)`);
    }
  }

  /** PENDING quá lâu không có worker xử lý → FAILED. */
  @Cron(CronExpression.EVERY_HOUR)
  async failAbandonedPendingExports() {
    const cutoff = new Date(Date.now() - REPORT_EXPORT_RETENTION_MS);
    const result = await this.prisma.reportExport.updateMany({
      where: {
        status: ExportJobStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      data: {
        status: ExportJobStatus.FAILED,
        errorMessage: 'Export abandoned (exceeded max wait time)',
        completedAt: new Date(),
      },
    });
    if (result.count > 0) {
      this.logger.warn(`Marked ${result.count} abandoned report export(s) as FAILED`);
    }
  }
}
