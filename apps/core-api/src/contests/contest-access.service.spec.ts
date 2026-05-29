/**
 * Contest visibility / IDOR patterns
 */
import { NotFoundException } from '@nestjs/common';
import { ContestStatus, Role } from '@prisma/client';
import { ContestAccessService } from './contest-access.service';

describe('ContestAccessService', () => {
  let prisma: { contest: { findUnique: jest.Mock } };
  let problemAccess: {
    assertCanListClassProblems: jest.Mock;
    userIsClassManager: jest.Mock;
    userHasActiveClassAccess: jest.Mock;
    resolveViewer: jest.Mock;
  };
  let service: ContestAccessService;

  beforeEach(() => {
    prisma = { contest: { findUnique: jest.fn() } };
    problemAccess = {
      assertCanListClassProblems: jest.fn(),
      userIsClassManager: jest.fn(),
      userHasActiveClassAccess: jest.fn(),
      resolveViewer: jest.fn(),
    };
    service = new ContestAccessService(prisma as any, problemAccess as any);
  });

  const classContest = {
    id: 'contest-1',
    status: ContestStatus.RUNNING,
    createdById: 'teacher-b',
    assignments: [{ classRoomId: 'class-b' }],
  };

  it('stranger cannot view class-scoped contest', async () => {
    problemAccess.userIsClassManager.mockResolvedValue(false);
    problemAccess.userHasActiveClassAccess.mockResolvedValue(false);

    await expect(
      service.assertCanViewContest(classContest, { userId: 'stranger', role: Role.CLIENT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('class member can view contest', async () => {
    problemAccess.userIsClassManager.mockResolvedValue(false);
    problemAccess.userHasActiveClassAccess.mockResolvedValue(true);

    await expect(
      service.assertCanViewContest(classContest, { userId: 'student-c', role: Role.CLIENT }),
    ).resolves.toBeUndefined();
  });

  it('admin can view any contest', async () => {
    await expect(
      service.assertCanViewContest(classContest, { userId: 'admin', role: Role.ADMIN }),
    ).resolves.toBeUndefined();
    expect(problemAccess.userHasActiveClassAccess).not.toHaveBeenCalled();
  });
});
