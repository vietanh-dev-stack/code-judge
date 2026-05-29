import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Queue, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CALIBRATE_LIMITS_QUEUE, CALIBRATE_LIMITS_QUEUE_EVENTS } from '../queues/tokens';
import { assertUserCanManageProblemAiForProblemId } from '../ai-testcase/ai-testcase-problem-auth.util';
import type { CalibrateProblemLimitsDto } from './dto/calibrate-problem-limits.dto';

export type CalibrateProblemLimitsResult = {
  problemId: string;
  goldenLanguage: string;
  memoryEnforced: boolean;
  cases: Array<{
    testCaseId: string;
    orderIndex: number;
    runtimeMs: number;
    memoryMb: number;
    verdict: string;
  }>;
  suggestedTimeLimitMs: number;
  suggestedMemoryLimitMb: number;
  currentTimeLimitMs: number;
  currentMemoryLimitMb: number;
};

@Injectable()
export class ProblemLimitsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CALIBRATE_LIMITS_QUEUE) private readonly calibrateQueue: Queue,
    @Inject(CALIBRATE_LIMITS_QUEUE_EVENTS) private readonly calibrateQueueEvents: QueueEvents,
  ) {}

  async calibrate(
    problemId: string,
    dto: CalibrateProblemLimitsDto,
    user: RequestUser,
  ): Promise<CalibrateProblemLimitsResult> {
    await assertUserCanManageProblemAiForProblemId(this.prisma, problemId, user);

    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        testCases: { select: { id: true }, take: 1 },
        goldenSolutions: { where: { isPrimary: true }, take: 1, select: { id: true } },
      },
    });
    if (!problem) {
      throw new NotFoundException('Problem không tồn tại');
    }
    if (!problem.testCases.length) {
      throw new BadRequestException('Problem chưa có testcase');
    }
    const hasGolden =
      problem.goldenSolutions.length > 0 ||
      (await this.prisma.goldenSolution.count({ where: { problemId } })) > 0;
    if (!hasGolden) {
      throw new BadRequestException('Problem chưa có golden solution');
    }

    const measureMs = dto.measureTimeLimitMs ?? 60_000;
    const job = await this.calibrateQueue.add(
      'calibrate',
      { problemId, measureTimeLimitMs: measureMs },
      {
        jobId: randomUUID(),
        removeOnComplete: 50,
        removeOnFail: 40,
      },
    );

    await this.calibrateQueueEvents.waitUntilReady();
    const waitMs = Math.min(600_000, measureMs * 50 + 120_000);

    try {
      return (await job.waitUntilFinished(this.calibrateQueueEvents, waitMs)) as CalibrateProblemLimitsResult;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new ServiceUnavailableException(
        `Worker calibrate-limits không hoàn tất. Đảm bảo worker + Judge0 đang chạy. Chi tiết: ${detail}`,
      );
    }
  }
}
