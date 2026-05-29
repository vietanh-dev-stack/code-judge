import { Module } from '@nestjs/common';
import { BullMqModule } from '../queues/bullmq.module';
import { ContestsModule } from '../contests/contests.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProblemsModule } from '../problems/problems.module';
import { ReportsAccessService } from './reports-access.service';
import { ReportsAggregationService } from './reports-aggregation.service';
import { ReportsCleanupCron } from './reports-cleanup.cron';
import { ReportsController } from './reports.controller';
import { ReportsExportProcessor } from './reports-export.processor';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule, ProblemsModule, ContestsModule, BullMqModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsAccessService,
    ReportsAggregationService,
    ReportsExportProcessor,
    ReportsCleanupCron,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
