import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsAccessService } from './reports-access.service';

describe('ReportsAccessService', () => {
  const prisma = {
    classRoom: { findUnique: jest.fn() },
    classAssignment: { findFirst: jest.fn() },
    contest: { findUnique: jest.fn() },
  };
  const problemAccess = {
    userIsClassManager: jest.fn(),
  };
  let service: ReportsAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsAccessService(prisma as any, problemAccess as any);
  });

  it('allows ADMIN to export classroom', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({ id: 'c1', isActive: true });
    await expect(
      service.assertCanExportClassroom('c1', { userId: 'a1', email: 'a@x.com', role: Role.ADMIN }),
    ).resolves.toBeUndefined();
    expect(problemAccess.userIsClassManager).not.toHaveBeenCalled();
  });

  it('denies non-manager export', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({ id: 'c1', isActive: true });
    problemAccess.userIsClassManager.mockResolvedValue(false);
    await expect(
      service.assertCanExportClassroom('c1', {
        userId: 'u1',
        email: 'u@x.com',
        role: Role.CLIENT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
