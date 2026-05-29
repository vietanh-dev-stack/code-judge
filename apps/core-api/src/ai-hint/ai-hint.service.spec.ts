/**
 * SEC-AI-02, AI-HINT-02
 */
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { EnvKeys } from '../common';
import { AiHintService } from './ai-hint.service';
import type { RequestUser } from '../common/interfaces/request-user.interface';

describe('AiHintService', () => {
  const user: RequestUser = { userId: 'u1', email: 'u@test.com', role: 'CLIENT' as any };

  let config: { get: jest.Mock };
  let prisma: { submission: { findUnique: jest.Mock } };
  let problemsService: { findById: jest.Mock };
  let storage: { getObjectString: jest.Mock };
  let rateLimit: { assertWithinLimit: jest.Mock };
  let service: AiHintService;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) => {
        if (key === EnvKeys.AI_HINT_ENABLED) return 'true';
        if (key === EnvKeys.AI_HINT_DISABLED_IN_CONTEST) return 'true';
        return undefined;
      }),
    };
    prisma = { submission: { findUnique: jest.fn() } };
    problemsService = { findById: jest.fn() };
    storage = { getObjectString: jest.fn() };
    rateLimit = { assertWithinLimit: jest.fn().mockResolvedValue(undefined) };
    service = new AiHintService(
      config as any,
      prisma as any,
      problemsService as any,
      storage as any,
      rateLimit as any,
    );
  });

  describe('isHintBlockedForContest', () => {
    it('SEC-AI-02: blocks hint when submission has contestId (default env)', () => {
      expect(service.isHintBlockedForContest('contest-1')).toBe(true);
      expect(service.isHintBlockedForContest(null)).toBe(false);
    });
  });

  describe('requestHint', () => {
    const baseSubmission = {
      id: 'sub-1',
      userId: 'u1',
      problemId: 'p1',
      status: SubmissionStatus.Wrong,
      language: 'python',
      error: null,
      compileLog: null,
      testsPassed: 0,
      testsTotal: 2,
      contestId: 'contest-1',
      sourceCode: 'print(1)',
      sourceCodeObjectKey: null,
      caseResults: null,
    };

    it('SEC-AI-02: rejects hint request for contest submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(baseSubmission);
      await expect(
        service.requestHint('p1', { submissionId: 'sub-1' } as any, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when AI hint is disabled globally', async () => {
      config.get.mockImplementation((key: string) =>
        key === EnvKeys.AI_HINT_ENABLED ? 'false' : undefined,
      );
      await expect(
        service.requestHint('p1', { submissionId: 'sub-1' } as any, user),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('loadSourceCode (AI-HINT-02)', () => {
    it('truncates source longer than 16KB', async () => {
      const long = 'x'.repeat(20_000);
      const result = await (service as any).loadSourceCode(long, null);
      expect(result.length).toBeLessThanOrEqual(16_384 + 30);
      expect(result).toContain('truncated');
    });
  });
});
