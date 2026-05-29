/**
 * Maps to SYSTEM-TEST-SCENARIOS: SEC-PRB-01, SEC-PRB-02, SEC-PRB-03
 */
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ProblemVisibility, Role } from '@prisma/client';
import { ProblemAccessService } from './problem-access.service';

describe('ProblemAccessService', () => {
  const teacherA = { userId: 'teacher-a', role: Role.CLIENT };
  const teacherB = { userId: 'teacher-b', role: Role.CLIENT };
  const studentC = { userId: 'student-c', role: Role.CLIENT };

  const classB = 'class-b';
  const problemPrivateB = {
    id: 'prob-b',
    visibility: ProblemVisibility.PRIVATE,
    isPublished: true,
    creatorId: 'teacher-b',
    assignments: [{ classRoomId: classB }],
  };

  let prisma: {
    classRoom: { findUnique: jest.Mock };
    classEnrollment: { findFirst: jest.Mock };
    contestProblem: { findFirst: jest.Mock };
    contest: { findUnique: jest.Mock };
    contestParticipant: { findUnique: jest.Mock };
    problem: { findUnique: jest.Mock };
  };
  let service: ProblemAccessService;

  beforeEach(() => {
    prisma = {
      classRoom: { findUnique: jest.fn() },
      classEnrollment: { findFirst: jest.fn() },
      contestProblem: { findFirst: jest.fn() },
      contest: { findUnique: jest.fn() },
      contestParticipant: { findUnique: jest.fn() },
      problem: { findUnique: jest.fn() },
    };
    service = new ProblemAccessService(prisma as any, { get: jest.fn() } as any);
  });

  function mockClassAccess(userId: string, classRoomId: string, allowed: boolean) {
    prisma.classRoom.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
      if (args.where.id !== classRoomId) return null;
      return { ownerId: allowed && userId === 'teacher-b' ? userId : 'other-owner', isActive: true };
    });
    prisma.classEnrollment.findFirst.mockImplementation(async (args: any) => {
      if (args.where.classRoomId !== classRoomId) return null;
      if (!allowed) return null;
      if (args.where.userId !== userId) return null;
      const requiredRole = args.where.role;
      if (requiredRole === 'OWNER') {
        return userId === 'teacher-b' ? { role: 'OWNER', status: 'ACTIVE' } : null;
      }
      return { role: 'MEMBER', status: 'ACTIVE' };
    });
  }

  it('SEC-PRB-01: Teacher A cannot manage problem created by Teacher B', async () => {
    mockClassAccess(teacherA.userId, classB, false);
    await expect(service.canManageProblem(problemPrivateB, teacherA.userId, teacherA.role)).resolves.toBe(
      false,
    );
  });

  it('SEC-PRB-01: Teacher B can manage own problem', async () => {
    mockClassAccess(teacherB.userId, classB, true);
    await expect(service.canManageProblem(problemPrivateB, teacherB.userId, teacherB.role)).resolves.toBe(
      true,
    );
  });

  it('SEC-PRB-02: Teacher A cannot view PRIVATE problem of class B (404)', async () => {
    mockClassAccess(teacherA.userId, classB, false);
    await expect(service.assertCanViewProblem(problemPrivateB, teacherA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('SEC-PRB-03: Student cannot view CONTEST_ONLY without contestId', async () => {
    const contestOnly = {
      ...problemPrivateB,
      visibility: ProblemVisibility.CONTEST_ONLY,
    };
    mockClassAccess(studentC.userId, classB, true);
    prisma.classRoom.findUnique.mockResolvedValue({ ownerId: 'teacher-b', isActive: true });

    await expect(service.assertCanViewProblem(contestOnly, studentC)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('SEC-PRB-03: Student can view CONTEST_ONLY when problem is in contest and enrolled', async () => {
    const contestOnly = {
      ...problemPrivateB,
      visibility: ProblemVisibility.CONTEST_ONLY,
    };
    prisma.classRoom.findUnique.mockResolvedValue({ ownerId: 'teacher-b', isActive: true });
    prisma.classEnrollment.findFirst.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });
    prisma.contestProblem.findFirst.mockResolvedValue({ contestId: 'contest-1' });
    prisma.contest.findUnique.mockResolvedValue({
      assignments: [{ classRoomId: classB }],
    });

    await expect(
      service.assertCanViewProblem(contestOnly, studentC, { contestId: 'contest-1' }),
    ).resolves.toBeUndefined();
  });

  it('member list filter hides CONTEST_ONLY problems', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({ ownerId: 'teacher-b', isActive: true });
    prisma.classEnrollment.findFirst.mockImplementation(async (args: { where?: { role?: string } }) => {
      if (args.where?.role === 'OWNER') return null;
      return { role: 'MEMBER', status: 'ACTIVE' };
    });

    const filter = await service.buildClassListVisibilityFilter('class-b', studentC);
    expect(filter).toEqual({ visibility: { not: ProblemVisibility.CONTEST_ONLY } });
  });

  it('assertCanListClassProblems requires authenticated viewer', async () => {
    await expect(service.assertCanListClassProblems('class-b', null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
