/**
 * Maps to SYSTEM-TEST-SCENARIOS: ADM-F-01
 */
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new UsersService(prisma as any, {} as any, {} as any);
  });

  it('ADM-F-01: blocks deactivating the last active admin', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(1);

    await expect(service.toggleStatus('admin-1', false)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('ADM-F-01: blocks downgrading last active admin role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(1);

    await expect(service.updateRole('admin-1', Role.CLIENT)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('ADM-F-01: allows deactivating admin when another active admin exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(2);
    prisma.user.update.mockResolvedValue({ id: 'admin-1', isActive: false });

    await expect(service.toggleStatus('admin-1', false)).resolves.toMatchObject({ isActive: false });
  });
});
