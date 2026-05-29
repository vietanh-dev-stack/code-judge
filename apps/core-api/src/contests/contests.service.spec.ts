/**
 * Maps to SYSTEM-TEST-SCENARIOS: RT-CON-02, RT-CON-04
 */
import { ContestStatus, Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { ContestsService } from './contests.service';

describe('ContestsService.getLeaderboard', () => {
  const PENALTY_PER_FAILED_MS = 20 * 60 * 1000;
  const contestStart = new Date('2026-01-01T10:00:00.000Z');

  let prisma: {
    contest: { findUnique: jest.Mock; delete: jest.Mock };
    submission: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    $transaction: jest.Mock;
    classAssignment: { deleteMany: jest.Mock };
  };
  let contestAccess: { assertCanViewContest: jest.Mock };
  let storage: { resolveAvatarImageUrl: jest.Mock };
  let service: ContestsService;

  beforeEach(() => {
    prisma = {
      contest: { findUnique: jest.fn(), delete: jest.fn() },
      submission: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      classAssignment: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          classAssignment: { deleteMany: prisma.classAssignment.deleteMany },
          contest: { delete: prisma.contest.delete },
        }),
      ),
    };
    contestAccess = { assertCanViewContest: jest.fn().mockResolvedValue(undefined) };
    storage = { resolveAvatarImageUrl: jest.fn().mockResolvedValue(null) };

    service = new ContestsService(
      prisma as any,
      {} as any,
      { get: jest.fn() } as any,
      storage as any,
      contestAccess as any,
    );
  });

  function mockContest() {
    prisma.contest.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        status: ContestStatus.RUNNING,
        createdById: 'teacher-1',
        assignments: [{ classRoomId: 'class-1' }],
      })
      .mockResolvedValueOnce({
        id: 'c1',
        title: 'Test Contest',
        startAt: contestStart,
        endAt: new Date('2026-01-01T14:00:00.000Z'),
        problems: [
          {
            problemId: 'p1',
            orderIndex: 0,
            points: 100,
            problem: { title: 'Problem A' },
          },
        ],
        participants: [
          {
            userId: 'u1',
            user: { name: 'Alice', image: null, imageObjectKey: null },
          },
        ],
      });
  }

  it('RT-CON-02: penalty = time to AC + 20min per failed attempt before AC', async () => {
    mockContest();
    const wa1 = new Date('2026-01-01T10:10:00.000Z');
    const wa2 = new Date('2026-01-01T10:20:00.000Z');
    const ac = new Date('2026-01-01T10:30:00.000Z');

    prisma.submission.findMany.mockResolvedValue([
      { userId: 'u1', problemId: 'p1', status: 'Wrong Answer', createdAt: wa1, isDryRun: false },
      { userId: 'u1', problemId: 'p1', status: 'Wrong Answer', createdAt: wa2, isDryRun: false },
      { userId: 'u1', problemId: 'p1', status: 'Accepted', createdAt: ac, isDryRun: false },
    ]);

    const result = await service.getLeaderboard('c1', { userId: 'u1', role: Role.CLIENT });
    const row = result.leaderboard.find((r) => r.userId === 'u1');
    const prob = row?.problems[0];

    expect(prob?.isSolved).toBe(true);
    expect(prob?.attempts).toBe(3);
    const expectedPenalty =
      ac.getTime() - contestStart.getTime() + 2 * PENALTY_PER_FAILED_MS;
    expect(prob?.penalty).toBe(expectedPenalty);
    expect(row?.totalScore).toBe(100);
  });

  it('RT-CON-04: marks problem pending when a submission is still running', async () => {
    mockContest();
    prisma.submission.findMany.mockResolvedValue([
      {
        userId: 'u1',
        problemId: 'p1',
        status: 'Running',
        createdAt: new Date('2026-01-01T10:05:00.000Z'),
        isDryRun: false,
      },
    ]);

    const result = await service.getLeaderboard('c1', { userId: 'u1', role: Role.CLIENT });
    const prob = result.leaderboard.find((r) => r.userId === 'u1')?.problems[0];

    expect(prob?.isPending).toBe(true);
    expect(prob?.isSolved).toBe(false);
    expect(prob?.points).toBe(0);
  });
});

describe('ContestsService.delete', () => {
  let prisma: {
    contest: { findUnique: jest.Mock; delete: jest.Mock };
    $transaction: jest.Mock;
    classAssignment: { deleteMany: jest.Mock };
  };
  let contestAccess: { assertCanViewContest: jest.Mock };
  let service: ContestsService;

  beforeEach(() => {
    prisma = {
      contest: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({ id: 'c1' }) },
      classAssignment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          classAssignment: { deleteMany: prisma.classAssignment.deleteMany },
          contest: { delete: prisma.contest.delete },
        }),
      ),
    };
    contestAccess = { assertCanViewContest: jest.fn() };
    service = new ContestsService(
      prisma as any,
      {} as any,
      { get: jest.fn() } as any,
      { resolveAvatarImageUrl: jest.fn() } as any,
      contestAccess as any,
    );
  });

  it('CON-F-01: non-admin cannot delete contest in archived class', async () => {
    prisma.contest.findUnique.mockResolvedValue({
      createdById: 'teacher-b',
      assignments: [{ classRoom: { isActive: false } }],
    });
    await expect(service.delete('c1', 'teacher-b', false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
