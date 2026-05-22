import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { StorageAccessService } from './storage-access.service';
import { ProblemStorageAccessService } from './problem-storage-access.service';

describe('StorageAccessService', () => {
  const userA: RequestUser = { userId: 'user-a', email: 'a@test.com', role: Role.CLIENT };
  const userB: RequestUser = { userId: 'user-b', email: 'b@test.com', role: Role.CLIENT };

  const problemAccess = {
    isAdminBypass: jest.fn().mockReturnValue(false),
    assertSubmissionOwner: jest.fn(),
    assertGoldenUploader: jest.fn(),
    assertAiJobOwner: jest.fn(),
    assertAiJobSharedRead: jest.fn(),
    assertGoldenSharedRead: jest.fn(),
    assertReportExportOwner: jest.fn(),
  } as unknown as ProblemStorageAccessService;

  const prisma = {
    reportExport: { findUnique: jest.fn() },
    goldenSolution: { findUnique: jest.fn() },
  } as any;

  let service: StorageAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageAccessService(problemAccess, prisma);
  });

  it('allows any logged-in user to presign download avatar (R0)', async () => {
    await expect(
      service.assertPresignDownloadAllowed('avatars/user-b/2026/01/x.png', userA),
    ).resolves.toBeUndefined();
    expect(problemAccess.assertSubmissionOwner).not.toHaveBeenCalled();
  });

  it('denies presign upload avatar for another user', async () => {
    await expect(
      service.assertPresignUploadAllowed({ resourceKind: 'avatar', userId: 'user-b' }, userA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('checks submission owner on presign upload submission-source', async () => {
    (problemAccess.assertSubmissionOwner as jest.Mock).mockResolvedValue(undefined);
    await service.assertPresignUploadAllowed(
      { resourceKind: 'submission-source', submissionId: 'sub-1' },
      userA,
    );
    expect(problemAccess.assertSubmissionOwner).toHaveBeenCalledWith('sub-1', 'user-a');
  });

  it('delegates ai-jobs download to shared read', async () => {
    (problemAccess.assertAiJobSharedRead as jest.Mock).mockResolvedValue(undefined);
    await service.assertPresignDownloadAllowed('ai-jobs/job-1/input/doc.pdf', userA);
    expect(problemAccess.assertAiJobSharedRead).toHaveBeenCalledWith('job-1', userA);
  });
});
