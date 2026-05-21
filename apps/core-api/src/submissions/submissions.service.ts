import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionGateway } from '../realtime/submission.gateway';
import { JUDGE_QUEUE } from '../queues/tokens';
import { JUDGE_JOB_MAX_ATTEMPTS } from '../common/constants/queue.constants';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { buildSubmissionSourceObjectKey } from '../storage/storage-key.builder';
import { StorageService } from '../storage/storage.service';
import { Role } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SubmissionsService {
  constructor(
    @Inject(JUDGE_QUEUE) private readonly judgeQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly realtime: SubmissionGateway,
    private readonly storage: StorageService,
  ) {}

  async createAndEnqueue(dto: CreateSubmissionDto) {
    if (!dto.sourceCode && !dto.sourceCodeObjectKey) {
      throw new BadRequestException('sourceCode or sourceCodeObjectKey is required');
    }

    // Optimization: Use findUnique instead of upsert to reduce DB load during high concurrency
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new BadRequestException(`User ${dto.userId} not found. Please seed the database.`);
    }

    const problem = await this.prisma.problem.findUnique({ where: { id: dto.problemId } });
    if (!problem) {
      throw new BadRequestException(`Problem ${dto.problemId} not found. Please seed the database.`);
    }

    let contestId: string | undefined;
    let context: 'PRACTICE' | 'CONTEST' = 'PRACTICE';
    if (dto.contestId) {
      const contest = await this.prisma.contest.findUnique({
        where: { id: dto.contestId },
        include: {
          problems: { where: { problemId: dto.problemId }, select: { problemId: true } },
        },
      });
      if (!contest) {
        throw new BadRequestException('Contest not found');
      }
      if (contest.problems.length === 0) {
        throw new BadRequestException('Problem does not belong to this contest');
      }
      contestId = dto.contestId;
      context = 'CONTEST';

      // Validate maxSubmissionsPerProblem limit if it is a real submit (not dry run)
      if (!dto.isDryRun && contest.maxSubmissionsPerProblem !== null && contest.maxSubmissionsPerProblem > 0) {
        const count = await this.prisma.submission.count({
          where: {
            userId: dto.userId,
            problemId: dto.problemId,
            contestId: dto.contestId,
            isDryRun: false,
          },
        });
        if (count >= contest.maxSubmissionsPerProblem) {
          throw new BadRequestException(
            `You have reached the maximum submission limit (${contest.maxSubmissionsPerProblem} attempts) for this problem in this contest.`
          );
        }
      }
    }

    const sourceCode = dto.sourceCode ?? null;
    const shouldExternalizeCode = sourceCode !== null && sourceCode.length > 8192;
    const externalizedObjectKey = dto.sourceCodeObjectKey ?? null;
    const submission = await this.prisma.submission.create({
      data: {
        userId: dto.userId,
        problemId: dto.problemId,
        mode: dto.mode as any,
        context,
        contestId,
        language: dto.language ?? null,
        attemptNumber: 1,
        judgePriority: 0,
        status: 'Pending',
        sourceCode: shouldExternalizeCode ? null : sourceCode,
        sourceCodeObjectKey: externalizedObjectKey,
        isDryRun: dto.isDryRun ?? false,
      },
    });

    if (shouldExternalizeCode && sourceCode) {
      const objectKey = buildSubmissionSourceObjectKey(submission.id, 'source.txt');
      await this.storage.putObject(objectKey, sourceCode, {
        'Content-Type': 'text/plain',
        submissionId: submission.id,
        problemId: dto.problemId,
        ownerId: dto.userId,
      });
      await this.prisma.submission.update({
        where: { id: submission.id },
        data: { sourceCodeObjectKey: objectKey },
      });
      submission.sourceCodeObjectKey = objectKey;
    }

    await this.judgeQueue.add(
      'judge',
      { submissionId: submission.id },
      {
        jobId: submission.id,
        attempts: JUDGE_JOB_MAX_ATTEMPTS,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    // Immediate feedback for UI.
    this.realtime.emitToUser(dto.userId, 'submission:created', {
      submissionId: submission.id,
      status: submission.status,
    });

    if (contestId && !dto.isDryRun) {
      this.realtime.emitToAll('submission:created', {
        submissionId: submission.id,
        contestId,
        userId: dto.userId,
        status: submission.status,
      });
    }

    return submission;
  }

  async findById(submissionId: string, req?: any) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        problemId: true,
        status: true,
        score: true,
        error: true,
        logs: true,
        caseResults: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        problem: {
          select: {
            creatorId: true,
            assignments: { select: { classRoomId: true } },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission không tồn tại');
    }

    // Check if the user is authorized to view raw, unsanitized hidden outputs (admin/creator/teacher)
    let isAuthorized = false;
    if (req) {
      const token = req.cookies?.accessToken;
      if (token) {
        try {
          const decoded: any = jwt.decode(token);
          if (decoded && decoded.sub) {
            const userId = decoded.sub;
            const role = decoded.role;
            isAuthorized = await this.canManageProblem(submission.problem, userId, role);
          }
        } catch (err) {
          // Token decode fail, treat as unauthorized (student)
        }
      }
    }

    // Process caseResults and dynamically map isHidden from the database to bypass worker lag
    if (submission.caseResults) {
      try {
        const resultsObj = JSON.parse(JSON.stringify(submission.caseResults));
        if (resultsObj.testCases && Array.isArray(resultsObj.testCases)) {
          const problemTestCases = await this.prisma.testCase.findMany({
            where: { problemId: submission.problemId },
            select: { id: true, isHidden: true },
          });
          const hiddenMap = new Map(problemTestCases.map(tc => [tc.id, tc.isHidden]));

          resultsObj.testCases = resultsObj.testCases.map((tc: any) => {
            const isHidden = hiddenMap.get(tc.testCaseId) ?? tc.isHidden ?? false;
            if (isHidden) {
              return {
                ...tc,
                isHidden: true,
                output: isAuthorized ? tc.output : '[Hidden Test Case]',
                error: isAuthorized ? tc.error : (tc.error ? '[Hidden Test Case]' : null),
              };
            }
            return {
              ...tc,
              isHidden: false,
            };
          });
        }
        submission.caseResults = resultsObj;
      } catch (err) {
        // Safe fallback
      }
    }

    // We should not return the "problem" select block to the client
    const { problem, ...rest } = submission as any;
    return rest;
  }

  private async canManageProblem(
    problem: {
      creatorId: string | null;
      assignments: { classRoomId: string }[];
    },
    userId: string,
    role?: string,
  ): Promise<boolean> {
    if (role === Role.ADMIN) {
      return true;
    }
    if (problem.creatorId === userId) {
      return true;
    }
    for (const a of problem.assignments) {
      if (await this.userIsClassOwnerForRoom(a.classRoomId, userId)) {
        return true;
      }
    }
    return false;
  }

  private async userIsClassOwnerForRoom(classRoomId: string, userId: string): Promise<boolean> {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { ownerId: true, isActive: true },
    });
    if (!classRoom) {
      return false;
    }

    if (!classRoom.isActive) {
      return false;
    }

    if (classRoom.ownerId === userId) {
      return true;
    }
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    return Boolean(enrollment);
  }

  async findMany(filter: { userId?: string; problemId?: string }) {
    const where: Record<string, unknown> = {
      isDryRun: false,
    };
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.problemId) {
      where.problemId = filter.problemId;
    }

    if (Object.keys(where).length === 0) {
      return [];
    }

    return this.prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        score: true,
        error: true,
        logs: true,
        caseResults: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

/** Slug duy nhất cho dev upsert (ký tự an toàn URL; fallback khi chuỗi rỗng). */
function devProblemSlug(problemId: string): string {
  const raw = problemId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.length > 0 ? raw : `p-${problemId.replace(/[^a-zA-Z0-9-_]/g, '') || 'unknown'}`;
}
