import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Queue, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GOLDEN_VERIFY_QUEUE, GOLDEN_VERIFY_QUEUE_EVENTS } from '../queues/tokens';
import { StorageService } from '../storage/storage.service';
import { VerifyTestcasesWithGoldenDto } from './dto/verify-testcases-with-golden.dto';
import { normalizeGoldenVerifyLanguage } from './golden-verify-language.util';

export interface VerifyTestcasesWithGoldenResult {
  language: string;
  goldenSource: 'inline' | 'database';
  goldenSolutionId?: string;
  summary: { total: number; passed: number; failed: number };
  results: Array<{
    index: number;
    passed: boolean;
    expectedOutput: string;
    actualOutput?: string;
    stderr?: string;
    verdict: 'OK' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'PYTHON_NOT_FOUND';
  }>;
}

type GoldenVerifyWorkerPayload = {
  summary: VerifyTestcasesWithGoldenResult['summary'];
  results: VerifyTestcasesWithGoldenResult['results'];
};

@Injectable()
export class AiGoldenVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(GOLDEN_VERIFY_QUEUE) private readonly goldenQueue: Queue,
    @Inject(GOLDEN_VERIFY_QUEUE_EVENTS) private readonly goldenQueueEvents: QueueEvents,
  ) {}

  async verify(dto: VerifyTestcasesWithGoldenDto, user: RequestUser): Promise<VerifyTestcasesWithGoldenResult> {
    const usePersisted = dto.usePersistedTestCases === true;
    const draft = dto.testCases ?? [];

    if (usePersisted && draft.length > 0) {
      throw new BadRequestException('Không gửi testCases khi usePersistedTestCases=true');
    }
    if (!usePersisted && draft.length === 0) {
      throw new BadRequestException('Cần testCases (hoặc bật usePersistedTestCases)');
    }
    if (usePersisted && !dto.problemId) {
      throw new BadRequestException('problemId bắt buộc khi usePersistedTestCases');
    }

    const inlineGolden = dto.goldenSourceCode?.trim() ?? '';

    if (!inlineGolden && !dto.problemId) {
      throw new BadRequestException('Cần problemId (golden trong DB) hoặc goldenSourceCode');
    }

    if (inlineGolden) {
      await this.assertCanUseInlineGolden(user, dto.problemId);
    } else if (dto.problemId) {
      await this.assertUserCanManageProblemAiForProblemId(dto.problemId, user);
    }

    let goldenSource: 'inline' | 'database';
    let goldenSolutionId: string | undefined;
    let code: string;
    let verifyLanguage: string;

    if (inlineGolden) {
      goldenSource = 'inline';
      code = inlineGolden;
      try {
        verifyLanguage = normalizeGoldenVerifyLanguage(dto.language);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Tham số language không hợp lệ cho verify golden',
        );
      }
    } else {
      goldenSource = 'database';
      const golden = dto.goldenSolutionId
        ? await this.prisma.goldenSolution.findFirst({
            where: { id: dto.goldenSolutionId, problemId: dto.problemId! },
          })
        : await this.prisma.goldenSolution.findFirst({
            where: { problemId: dto.problemId!, isPrimary: true },
          });

      const fallback =
        golden ??
        (await this.prisma.goldenSolution.findFirst({
          where: { problemId: dto.problemId! },
          orderBy: { createdAt: 'asc' },
        }));

      if (!fallback) {
        throw new BadRequestException('Problem chưa có golden solution (tạo hoặc truyền goldenSourceCode)');
      }

      goldenSolutionId = fallback.id;
      let loaded = fallback.sourceCode?.trim() ?? '';
      if (!loaded && fallback.sourceCodeObjectKey) {
        loaded = (await this.storage.getObjectString(fallback.sourceCodeObjectKey)).trim();
      }
      if (!loaded) {
        throw new BadRequestException('Golden solution không có mã nguồn (file hoặc DB trống)');
      }
      code = loaded;
      try {
        verifyLanguage = normalizeGoldenVerifyLanguage(fallback.language);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error
            ? e.message
            : 'Ngôn ngữ golden trong DB không hợp lệ — cập nhật bản ghi GoldenSolution.language',
        );
      }
    }

    let cases: Array<{ input: string; expectedOutput: string }>;
    if (usePersisted) {
      const rows = await this.prisma.testCase.findMany({
        where: { problemId: dto.problemId! },
        orderBy: { orderIndex: 'asc' },
      });
      if (!rows.length) {
        throw new BadRequestException('Problem chưa có test case trong DB');
      }
      cases = rows.map((r) => ({ input: r.input, expectedOutput: r.expectedOutput }));
    } else {
      cases = draft.map((c) => ({ input: c.input, expectedOutput: c.expectedOutput }));
    }

    const timeLimit = dto.timeLimitMsPerCase ?? 15_000;

    const job = await this.goldenQueue.add(
      'verify',
      {
        goldenSourceCode: code,
        language: verifyLanguage,
        testCases: cases,
        timeLimitMs: timeLimit,
      },
      {
        jobId: randomUUID(),
        removeOnComplete: 100,
        removeOnFail: 80,
      },
    );

    await this.goldenQueueEvents.waitUntilReady();
    const waitMs = Math.min(300_000, timeLimit * cases.length + 60_000);

    let workerPayload: GoldenVerifyWorkerPayload;
    try {
      workerPayload = (await job.waitUntilFinished(
        this.goldenQueueEvents,
        waitMs,
      )) as GoldenVerifyWorkerPayload;
    } catch (e) {
      throw new ServiceUnavailableException(
        `Worker golden-verify không hoàn tất (đã chạy worker chưa?): ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return {
      language: verifyLanguage,
      goldenSource,
      goldenSolutionId,
      summary: workerPayload.summary,
      results: workerPayload.results,
    };
  }

  private async assertCanUseInlineGolden(user: RequestUser, problemId?: string): Promise<void> {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (problemId) {
      await this.assertUserCanManageProblemAiForProblemId(problemId, user);
      return;
    }
    throw new ForbiddenException(
      'goldenSourceCode: cần tài khoản ADMIN hoặc kèm problemId (chủ đề) để dán mã golden',
    );
  }

  private async assertUserCanManageProblemAiForProblemId(
    problemId: string,
    user: RequestUser,
  ): Promise<void> {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, creatorId: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem không tồn tại');
    }
    if (user.role === Role.ADMIN) {
      return;
    }
    if (problem.creatorId === null || problem.creatorId === user.userId) {
      return;
    }
    throw new ForbiddenException('Chỉ chủ đề (creator) hoặc admin mới chạy verify trên problem này');
  }
}
