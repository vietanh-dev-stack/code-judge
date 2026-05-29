/**
 * Maps to SYSTEM-TEST-SCENARIOS: SEC-SUB-01, SEC-SUB-02
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import type { RequestUser } from '../common/interfaces/request-user.interface';

describe('SubmissionsService.findById', () => {
  const owner: RequestUser = { userId: 'user-a', email: 'a@test.com', role: Role.CLIENT };
  const other: RequestUser = { userId: 'user-b', email: 'b@test.com', role: Role.CLIENT };

  let prisma: {
    submission: { findUnique: jest.Mock };
    testCase: { findMany: jest.Mock };
    classRoom: { findUnique: jest.Mock };
    classEnrollment: { findFirst: jest.Mock };
  };
  let service: SubmissionsService;

  beforeEach(() => {
    prisma = {
      submission: { findUnique: jest.fn() },
      testCase: { findMany: jest.fn() },
      classRoom: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'teacher-1', isActive: true }) },
      classEnrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    service = new SubmissionsService(
      { add: jest.fn() } as any,
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      { assertCanViewProblemById: jest.fn() } as any,
      {} as any,
    );
  });

  const baseSubmission = {
    id: 'sub-1',
    userId: owner.userId,
    problemId: 'prob-1',
    status: 'Wrong Answer',
    score: 0,
    error: null,
    logs: null,
    language: 'python',
    createdAt: new Date(),
    updatedAt: new Date(),
    problem: { creatorId: 'teacher-1', assignments: [{ classRoomId: 'c1' }] },
    caseResults: {
      testCases: [
        {
          testCaseId: 'tc-hidden',
          status: 'WA',
          output: 'secret-out',
          error: null,
          isHidden: true,
        },
        {
          testCaseId: 'tc-sample',
          status: 'WA',
          output: '1 2',
          error: null,
          isHidden: false,
        },
      ],
    },
  };

  it('SEC-SUB-01: forbids another student from viewing submission', async () => {
    prisma.submission.findUnique.mockResolvedValue(baseSubmission);
    await expect(service.findById('sub-1', other)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('SEC-SUB-02: student owner sees redacted hidden testcase output', async () => {
    prisma.submission.findUnique.mockResolvedValue(baseSubmission);
    prisma.testCase.findMany.mockResolvedValue([
      { id: 'tc-hidden', isHidden: true },
      { id: 'tc-sample', isHidden: false },
    ]);

    const result = await service.findById('sub-1', owner);
    const cases = (result.caseResults as any).testCases;

    expect(cases[0].output).toBe('[Hidden Test Case]');
    expect(cases[1].output).toBe('1 2');
  });

  it('returns 404 when submission does not exist', async () => {
    prisma.submission.findUnique.mockResolvedValue(null);
    await expect(service.findById('missing', owner)).rejects.toBeInstanceOf(NotFoundException);
  });
});
