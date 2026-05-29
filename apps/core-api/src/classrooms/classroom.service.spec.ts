/**
 * SEC-CLS-01, CLS-E-01, CLS-H-02, CLS-F-01
 */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('./utils/generate-class-code', () => ({
  generateClassCode: jest.fn(() => 'TESTCODE1'),
}));

import { ClassroomService } from './classroom.service';

describe('ClassroomService', () => {
  let prisma: {
    classRoom: { findUnique: jest.Mock; update: jest.Mock };
    classEnrollment: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let service: ClassroomService;

  beforeEach(() => {
    prisma = {
      classRoom: { findUnique: jest.fn(), update: jest.fn() },
      classEnrollment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ClassroomService(prisma as any, {
      resolveAvatarImageUrl: jest.fn().mockResolvedValue(null),
    } as any);
  });

  it('SEC-CLS-01: non-member cannot get class detail', async () => {
    prisma.classEnrollment.findFirst.mockResolvedValue(null);
    await expect(service.getDetail('class-b', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('SEC-CLS-01: non-owner cannot archive class', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({
      id: 'class-b',
      ownerId: 'teacher-b',
      isActive: true,
    });
    await expect(service.archive('class-b', 'teacher-a')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('CLS-E-01: cannot join archived classroom', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({
      id: 'class-b',
      classCode: 'ABCD1234',
      isActive: false,
    });
    await expect(service.join({ classCode: 'ABCD1234' }, 'student-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('CLS-F-01: invalid class code returns not found', async () => {
    prisma.classRoom.findUnique.mockResolvedValue(null);
    await expect(service.join({ classCode: 'INVALID1' }, 'student-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('CLS-H-02: join with valid code creates enrollment', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({
      id: 'class-b',
      classCode: 'VALID123',
      isActive: true,
    });
    prisma.classEnrollment.findUnique.mockResolvedValue(null);
    prisma.classEnrollment.create.mockResolvedValue({ id: 'enr-1', status: 'ACTIVE' });

    await service.join({ classCode: 'VALID123' }, 'student-1');

    expect(prisma.classEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classRoomId: 'class-b',
          userId: 'student-1',
          role: 'MEMBER',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('CLS-E-01: owner cannot update archived classroom', async () => {
    prisma.classRoom.findUnique.mockResolvedValue({
      id: 'class-b',
      ownerId: 'teacher-b',
      isActive: false,
    });
    await expect(service.update('class-b', { name: 'New' }, 'teacher-b')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
