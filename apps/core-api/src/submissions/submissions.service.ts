import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionGateway } from '../realtime/submission.gateway';
import { JUDGE_QUEUE } from '../queues/tokens';
import { JUDGE_JOB_MAX_ATTEMPTS } from '../common/constants/queue.constants';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { FinalizeSubmissionDto } from './dto/finalize-submission.dto';
import { ReserveSubmissionDto } from './dto/reserve-submission.dto';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { buildSubmissionSourceObjectKey } from '../storage/storage-key.builder';
import { ContestAccessService } from '../contests/contest-access.service';
import { ProblemAccessService } from '../problems/problem-access.service';
import { ProblemStorageAccessService } from '../storage/problem-storage-access.service';
import { SUBMISSION_SOURCE_INLINE_MAX_BYTES } from '../storage/storage-resource.constants';
import { StorageService } from '../storage/storage.service';
import { Role, type SubmissionContext } from '@prisma/client';

@Injectable()
export class SubmissionsService {
  constructor(
    @Inject(JUDGE_QUEUE) private readonly judgeQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly realtime: SubmissionGateway,
    private readonly storage: StorageService,
    private readonly storageAccess: ProblemStorageAccessService,
    private readonly problemAccess: ProblemAccessService,
    private readonly contestAccess: ContestAccessService,
  ) {}

  private async assertCanSubmitToProblem(
    problemId: string,
    user: RequestUser,
    contestId?: string,
  ): Promise<void> {
    const viewer = { userId: user.userId, role: user.role };
    if (contestId) {
      await this.contestAccess.assertCanViewContestById(contestId, viewer);
    }
    await this.problemAccess.assertCanViewProblemById(problemId, viewer, { contestId });
  }

  /** JWT user reserves a row before presigned MinIO upload (large source). */
  async reserve(dto: ReserveSubmissionDto, user: RequestUser) {
    const scope = await this.resolveSubmissionScope(
      dto.problemId,
      user.userId,
      dto.contestId,
      dto.isDryRun ?? false,
    );
    await this.assertCanSubmitToProblem(dto.problemId, user, scope.contestId);

    const submission = await this.prisma.submission.create({
      data: {
        userId: user.userId,
        problemId: dto.problemId,
        mode: dto.mode as any,
        context: scope.context,
        contestId: scope.contestId,
        classRoomId: scope.classRoomId,
        classAssignmentId: scope.classAssignmentId,
        language: dto.language ?? null,
        attemptNumber: 1,
        judgePriority: 0,
        status: 'Pending',
        sourceCode: null,
        sourceCodeObjectKey: null,
        isDryRun: dto.isDryRun ?? false,
      },
    });

    return { submissionId: submission.id, status: submission.status };
  }

  /** Attach MinIO key after PUT, then enqueue judge. */
  async finalize(submissionId: string, dto: FinalizeSubmissionDto, user: RequestUser) {
    await this.storageAccess.assertSubmissionOwner(submissionId, user.userId);

    const key = dto.sourceCodeObjectKey.trim();
    const prefix = `submissions/${submissionId}/`;
    if (!key.startsWith(prefix)) {
      throw new ForbiddenException('sourceCodeObjectKey không khớp submission này');
    }

    const existing = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
        problemId: true,
        contestId: true,
        status: true,
        sourceCodeObjectKey: true,
        isDryRun: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Submission không tồn tại');
    }

    const submission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { sourceCodeObjectKey: key },
    });

    await this.enqueueJudge(submission);

    return { submissionId: submission.id, status: submission.status };
  }

  async createAndEnqueue(dto: CreateSubmissionDto, user: RequestUser) {
    if (!dto.sourceCode && !dto.sourceCodeObjectKey) {
      throw new BadRequestException('sourceCode or sourceCodeObjectKey is required');
    }
    if (dto.userId && dto.userId !== user.userId) {
      throw new ForbiddenException('Không thể nộp bài thay user khác');
    }

    const userId = user.userId;
    const scope = await this.resolveSubmissionScope(
      dto.problemId,
      userId,
      dto.contestId,
      dto.isDryRun ?? false,
    );
    await this.assertCanSubmitToProblem(dto.problemId, user, scope.contestId);

    const sourceCode = dto.sourceCode ?? null;
    const shouldExternalizeCode =
      sourceCode !== null && sourceCode.length > SUBMISSION_SOURCE_INLINE_MAX_BYTES;
    const externalizedObjectKey = dto.sourceCodeObjectKey ?? null;
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        problemId: dto.problemId,
        mode: dto.mode as any,
        context: scope.context,
        contestId: scope.contestId,
        classRoomId: scope.classRoomId,
        classAssignmentId: scope.classAssignmentId,
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
        ownerId: userId,
      });
      await this.prisma.submission.update({
        where: { id: submission.id },
        data: { sourceCodeObjectKey: objectKey },
      });
      submission.sourceCodeObjectKey = objectKey;
    }

    await this.enqueueJudge(submission, {
      contestId: scope.contestId,
      isDryRun: dto.isDryRun ?? false,
    });

    return submission;
  }

  private async enqueueJudge(
    submission: { id: string; userId: string; status: string },
    opts?: { contestId?: string | null; isDryRun?: boolean },
  ) {
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

    this.realtime.emitToUser(submission.userId, 'submission:created', {
      submissionId: submission.id,
      status: submission.status,
    });

    if (opts?.contestId && !opts.isDryRun) {
      this.realtime.emitToAll('submission:created', {
        submissionId: submission.id,
        contestId: opts.contestId,
        userId: submission.userId,
        status: submission.status,
      });
    }
  }

  private async resolveClassAssignmentForUser(problemId: string, userId: string) {
    return this.prisma.classAssignment.findFirst({
      where: {
        problemId,
        classRoom: {
          enrollments: {
            some: { userId, status: 'ACTIVE' },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, classRoomId: true },
    });
  }

  private async resolveSubmissionScope(
    problemId: string,
    userId: string,
    contestIdInput: string | undefined,
    isDryRun: boolean,
  ): Promise<{
    contestId?: string;
    context: SubmissionContext;
    classRoomId: string | null;
    classAssignmentId: string | null;
  }> {
    if (!contestIdInput) {
      const assignment = await this.resolveClassAssignmentForUser(problemId, userId);
      if (assignment) {
        return {
          context: 'CLASS_ASSIGNMENT',
          classRoomId: assignment.classRoomId,
          classAssignmentId: assignment.id,
        };
      }
      return {
        context: 'PRACTICE',
        classRoomId: null,
        classAssignmentId: null,
      };
    }

    const contest = await this.prisma.contest.findUnique({
      where: { id: contestIdInput },
      include: {
        problems: { where: { problemId }, select: { problemId: true } },
      },
    });
    if (!contest) {
      throw new BadRequestException('Contest not found');
    }
    if (contest.problems.length === 0) {
      throw new BadRequestException('Problem does not belong to this contest');
    }

    if (
      !isDryRun &&
      contest.maxSubmissionsPerProblem !== null &&
      contest.maxSubmissionsPerProblem > 0
    ) {
      const count = await this.prisma.submission.count({
        where: {
          userId,
          problemId,
          contestId: contestIdInput,
          isDryRun: false,
        },
      });
      if (count >= contest.maxSubmissionsPerProblem) {
        throw new BadRequestException(
          `You have reached the maximum submission limit (${contest.maxSubmissionsPerProblem} attempts) for this problem in this contest.`,
        );
      }
    }

    const contestAssignment = await this.prisma.classAssignment.findFirst({
      where: { contestId: contestIdInput },
      select: { id: true, classRoomId: true },
    });

    return {
      contestId: contestIdInput,
      context: 'CONTEST',
      classRoomId: contestAssignment?.classRoomId ?? null,
      classAssignmentId: contestAssignment?.id ?? null,
    };
  }

  async findById(submissionId: string, user: RequestUser) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
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

    const isOwner = submission.userId === user.userId;
    const canManage = await this.canManageProblem(
      submission.problem,
      user.userId,
      user.role,
    );
    const canView =
      isOwner || user.role === Role.ADMIN || canManage;

    if (!canView) {
      throw new ForbiddenException('Không có quyền xem submission này');
    }

    /** Students may view their submission but must not see hidden testcase I/O (SEC-SUB-02). */
    const canSeeHiddenOutputs = user.role === Role.ADMIN || canManage;

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
                output: canSeeHiddenOutputs ? tc.output : '[Hidden Test Case]',
                error: canSeeHiddenOutputs ? tc.error : (tc.error ? '[Hidden Test Case]' : null),
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

  async findMany(filter: { problemId?: string }, user: RequestUser) {
    const where: Record<string, unknown> = {
      isDryRun: false,
      userId: user.userId,
    };
    if (filter.problemId) {
      where.problemId = filter.problemId;
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
