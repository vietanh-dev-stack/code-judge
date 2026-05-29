/**
 * SEC-CLS-01 (invite), CLS-H-01 edge
 */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvitesService } from './invites.service';

jest.mock('./utils/hash-token', () => ({
  hashToken: (t: string) => `hash-${t}`,
}));

describe('InvitesService', () => {
  let prisma: {
    classRoom: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    classEnrollment: { findUnique: jest.Mock };
    classInvite: { findUnique: jest.Mock; create: jest.Mock };
  };
  let mailer: { sendInviteMail: jest.Mock };
  let service: InvitesService;

  beforeEach(() => {
    prisma = {
      classRoom: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      classEnrollment: { findUnique: jest.fn() },
      classInvite: { findUnique: jest.fn(), create: jest.fn() },
    };
    mailer = { sendInviteMail: jest.fn().mockResolvedValue(undefined) };
    service = new InvitesService(prisma as any, mailer as any);
  });

  it('SEC-CLS-01: only owner can invite to class', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({
      id: 'class-b',
      ownerId: 'teacher-b',
      isActive: true,
      name: 'Class B',
    });
    await expect(
      service.inviteToClass('class-b', { email: 's@test.com' }, 'teacher-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.classInvite.create).not.toHaveBeenCalled();
  });

  it('acceptInvite: unknown token → not found', async () => {
    prisma.classInvite.findUnique.mockResolvedValue(null);
    await expect(service.acceptInvite('bad-token', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('acceptInvite: expired invite → bad request', async () => {
    prisma.classInvite.findUnique.mockResolvedValue({
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 60_000),
      email: 's@test.com',
      classRoomId: 'class-b',
      classRoom: { isActive: true },
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 's@test.com' });

    await expect(service.acceptInvite('token', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
