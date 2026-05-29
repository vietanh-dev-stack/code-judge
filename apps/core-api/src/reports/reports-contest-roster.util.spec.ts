import { resolveContestReportLeaderboard } from './reports-contest-roster.util';

describe('resolveContestReportLeaderboard', () => {
  const contestProblemFindMany = jest.fn().mockResolvedValue([
    {
      problemId: 'p1',
      points: 100,
      problem: { title: 'Problem A' },
    },
  ]);

  const enrollmentFindMany = jest.fn().mockResolvedValue([
    { userId: 's1', user: { name: 'Alice' } },
    { userId: 's2', user: { name: 'Bob' } },
  ]);

  const prisma = {
    contestProblem: { findMany: contestProblemFindMany },
    classEnrollment: { findMany: enrollmentFindMany },
  } as any;

  const scope = { ownerId: 'owner', staffUserIds: new Set(['owner']) };

  it('expands classroom contest to full class roster', async () => {
    const rows = await resolveContestReportLeaderboard(prisma, {
      contestId: 'c1',
      classRoomId: 'class-1',
      scope,
      rawLeaderboard: [
        {
          userId: 's1',
          userName: 'Alice',
          solvedCount: 1,
          totalScore: 100,
          totalPenalty: 0,
          problems: [
            {
              problemId: 'p1',
              problemTitle: 'Problem A',
              isSolved: true,
              attempts: 1,
              points: 100,
            },
          ],
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.userId).sort()).toEqual(['s1', 's2']);
    const bob = rows.find((r) => r.userId === 's2')!;
    expect(bob.totalScore).toBe(0);
    expect(bob.problems[0]?.attempts).toBe(0);
  });

  it('keeps public contest as participation-only leaderboard', async () => {
    const rows = await resolveContestReportLeaderboard(prisma, {
      contestId: 'c1',
      classRoomId: null,
      rawLeaderboard: [
        {
          userId: 'u9',
          userName: 'Guest',
          solvedCount: 0,
          totalScore: 0,
          totalPenalty: 0,
          problems: [
            {
              problemId: 'p1',
              problemTitle: 'Problem A',
              isSolved: false,
              attempts: 1,
              points: 0,
            },
          ],
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe('u9');
    expect(enrollmentFindMany).not.toHaveBeenCalled();
  });
});
