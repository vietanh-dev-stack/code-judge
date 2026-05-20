import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ContestStatus } from '@prisma/client';

@Injectable()
export class ContestsCronService {
  private readonly logger = new Logger(ContestsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleContestStatusUpdates() {
    const now = new Date();

    try {
      // 1. Transition PUBLISHED -> RUNNING
      const toRunning = await this.prisma.contest.updateMany({
        where: {
          status: ContestStatus.PUBLISHED,
          startAt: { lte: now },
          endAt: { gt: now },
        },
        data: {
          status: ContestStatus.RUNNING,
        },
      });

      if (toRunning.count > 0) {
        this.logger.log(`Updated ${toRunning.count} contests from PUBLISHED to RUNNING`);
      }

      // 2. Transition RUNNING / PUBLISHED -> ENDED
      const toEnded = await this.prisma.contest.updateMany({
        where: {
          status: { in: [ContestStatus.RUNNING, ContestStatus.PUBLISHED] },
          endAt: { lte: now },
        },
        data: {
          status: ContestStatus.ENDED,
        },
      });

      if (toEnded.count > 0) {
        this.logger.log(`Updated ${toEnded.count} contests to ENDED`);
      }
    } catch (error) {
      this.logger.error('Failed to update contest statuses via cron', error);
    }
  }
}
