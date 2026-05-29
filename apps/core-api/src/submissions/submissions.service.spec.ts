/**
 * Maps to SYSTEM-TEST-SCENARIOS: JUD-F-01, SEC-STO-01, CON-CON-02
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, SubmissionStatus } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import type { RequestUser } from '../common/interfaces/request-user.interface';

describe('SubmissionsService', () => {
  const userA: RequestUser = { userId: 'user-a', email: 'a@test.com', role: Role.CLIENT };

  let judgeQueue: { add: jest.Mock };
  let prisma: {
    submission: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    contest: { findUnique: jest.Mock };
  };
  let storageAccess: { assertSubmissionOwner: jest.Mock };
  let problemAccess: { assertCanViewProblemById: jest.Mock };
  let contestAccess: { assertCanViewContestById: jest.Mock };
  let service: SubmissionsService;

  beforeEach(() => {
    judgeQueue = { add: jest.fn().mockResolvedValue({}) };
    prisma = {
      submission: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      contest: { findUnique: jest.fn() },
    };
    storageAccess = { assertSubmissionOwner: jest.fn().mockResolvedValue(undefined) };
    problemAccess = { assertCanViewProblemById: jest.fn().mockResolvedValue(undefined) };
    contestAccess = { assertCanViewContestById: jest.fn().mockResolvedValue(undefined) };

    service = new SubmissionsService(
      judgeQueue as any,
      prisma as any,
      { emitToUser: jest.fn(), emitToAll: jest.fn() } as any,
      {} as any,
      storageAccess as any,
      problemAccess as any,
      contestAccess as any,
    );
  });

  it('JUD-F-01: forbids submitting on behalf of another user', async () => {
    await expect(
      service.createAndEnqueue(
        { problemId: 'p1', sourceCode: 'print(1)', userId: 'other-user' } as any,
        userA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('SEC-STO-01: finalize rejects object key outside submission prefix', async () => {
    prisma.submission.findUnique.mockResolvedValue({
      id: 'sub-1',
      userId: userA.userId,
      problemId: 'p1',
      contestId: null,
      status: SubmissionStatus.Pending,
      sourceCodeObjectKey: null,
      isDryRun: false,
    });

    await expect(
      service.finalize('sub-1', { sourceCodeObjectKey: 'submissions/sub-OTHER/x.txt' }, userA),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.submission.update).not.toHaveBeenCalled();
    expect(judgeQueue.add).not.toHaveBeenCalled();
  });

  it('SEC-STO-01: finalize accepts key with correct prefix and enqueues judge', async () => {
    const row = {
      id: 'sub-1',
      userId: userA.userId,
      problemId: 'p1',
      contestId: null,
      status: SubmissionStatus.Pending,
      sourceCodeObjectKey: null,
      isDryRun: false,
    };
    prisma.submission.findUnique.mockResolvedValue(row);
    prisma.submission.update.mockResolvedValue({ ...row, sourceCodeObjectKey: 'submissions/sub-1/s.txt' });

    await service.finalize('sub-1', { sourceCodeObjectKey: 'submissions/sub-1/s.txt' }, userA);

    expect(judgeQueue.add).toHaveBeenCalledWith(
      'judge',
      { submissionId: 'sub-1' },
      expect.objectContaining({ jobId: 'sub-1' }),
    );
  });

  it('JUD-E-01: dry-run does not check max contest submissions', async () => {
    prisma.contest.findUnique.mockResolvedValue({
      id: 'contest-1',
      maxSubmissionsPerProblem: 1,
      problems: [{ problemId: 'p1' }],
    });
    prisma.submission.create.mockResolvedValue({
      id: 'sub-dry',
      userId: userA.userId,
      status: SubmissionStatus.Pending,
    });

    await service.createAndEnqueue(
      {
        problemId: 'p1',
        sourceCode: 'print(1)',
        contestId: 'contest-1',
        isDryRun: true,
      } as any,
      userA,
    );

    expect(prisma.submission.count).not.toHaveBeenCalled();
  });

  it('CON-CON-02: rejects contest submit when max submissions reached', async () => {
    prisma.contest.findUnique.mockResolvedValue({
      id: 'contest-1',
      maxSubmissionsPerProblem: 1,
      problems: [{ problemId: 'p1' }],
    });
    prisma.submission.count.mockResolvedValue(1);

    await expect(
      service.createAndEnqueue(
        { problemId: 'p1', sourceCode: 'x', contestId: 'contest-1' } as any,
        userA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
