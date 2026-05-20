import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmissionStatus } from '@prisma/client';
import { EnvKeys } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemsService } from '../problems/problems.service';
import { StorageService } from '../storage/storage.service';
import { sanitizeAiHintOutput } from './ai-hint-filter.util';
import { AiHintRateLimitService } from './ai-hint-rate-limit.service';
import {
  aiHintOutputSchema,
  buildAiHintMessages,
  type AiHintOutput,
} from './ai-hint.prompt';
import { RequestHintDto } from './dto/request-hint.dto';

const SOURCE_MAX_BYTES = 16_384;
/** Floor/cap for hint output tokens (Gemini 2.5 thinking counts against maxOutputTokens). */
const HINT_OUTPUT_TOKEN_FLOOR = 4096;
const HINT_OUTPUT_TOKEN_CAP = 8192;

export type RequestHintResult = {
  submissionId: string;
  hints: AiHintOutput;
  provider: 'openai' | 'google';
  model: string;
};

type CaseResultsJson = {
  testCases?: Array<{
    testCaseId?: string;
    status?: string;
    passed?: boolean;
    input?: string;
    error?: string | null;
    isHidden?: boolean;
  }>;
};

@Injectable()
export class AiHintService {
  private readonly logger = new Logger(AiHintService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly problemsService: ProblemsService,
    private readonly storage: StorageService,
    private readonly rateLimit: AiHintRateLimitService,
  ) {}

  isEnabled(): boolean {
    const flag = (this.config.get<string>(EnvKeys.AI_HINT_ENABLED) ?? 'true').toLowerCase();
    return flag !== 'false' && flag !== '0';
  }

  /** Mặc định chặn gợi ý trong contest; set AI_HINT_DISABLED_IN_CONTEST=false để bật lại (dev/test). */
  isHintBlockedForContest(submissionContestId: string | null | undefined): boolean {
    const allowInContest =
      (this.config.get<string>(EnvKeys.AI_HINT_DISABLED_IN_CONTEST) ?? 'true').toLowerCase() ===
      'false';
    if (allowInContest) return false;
    return Boolean(submissionContestId);
  }

  async requestHint(
    problemId: string,
    dto: RequestHintDto,
    user: RequestUser,
    req?: Parameters<ProblemsService['findById']>[1],
  ): Promise<RequestHintResult> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('AI gợi ý đang tắt trên hệ thống.');
    }

    const submission = await this.prisma.submission.findUnique({
      where: { id: dto.submissionId },
      select: {
        id: true,
        userId: true,
        problemId: true,
        status: true,
        language: true,
        error: true,
        compileLog: true,
        testsPassed: true,
        testsTotal: true,
        contestId: true,
        sourceCode: true,
        sourceCodeObjectKey: true,
        caseResults: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.problemId !== problemId) {
      throw new BadRequestException('Submission does not belong to this problem');
    }
    if (submission.userId !== user.userId) {
      throw new ForbiddenException('Không có quyền xem gợi ý cho submission này');
    }
    if (submission.status === SubmissionStatus.Accepted) {
      throw new BadRequestException('Gợi ý chỉ khả dụng khi submission chưa đạt Accepted');
    }

    if (this.isHintBlockedForContest(submission.contestId)) {
      throw new ForbiddenException('Gợi ý AI không khả dụng khi làm bài trong contest.');
    }

    await this.rateLimit.assertWithinLimit(user.userId, problemId);

    const problem = await this.problemsService.findById(problemId, req);
    const hiddenIds = new Set(
      (problem.testCases ?? []).filter((tc) => tc.isHidden).map((tc) => tc.id),
    );
    const publicExpectedOutputs = (problem.testCases ?? [])
      .filter((tc) => !tc.isHidden && tc.expectedOutput)
      .map((tc) => tc.expectedOutput as string);

    const sourceCode = await this.loadSourceCode(submission.sourceCode, submission.sourceCodeObjectKey);
    const publicCaseFeedback = this.extractPublicCaseFeedback(
      submission.caseResults as CaseResultsJson | null,
      hiddenIds,
    );

    const tags =
      (problem as { tags?: Array<{ tag?: { name?: string } }> }).tags
        ?.map((pt) => pt.tag?.name)
        .filter((name): name is string => Boolean(name)) ?? [];

    const language = dto.language ?? submission.language ?? 'PYTHON';
    const supportedLanguages = Array.isArray(problem.supportedLanguages)
      ? (problem.supportedLanguages as string[])
      : [];
    const messages = buildAiHintMessages({
      problemTitle: problem.title,
      difficulty: problem.difficulty,
      statementMd: problem.statementMd ?? '',
      tags,
      supportedLanguages,
      language,
      submissionStatus: submission.status,
      testsPassed: submission.testsPassed ?? 0,
      testsTotal: submission.testsTotal ?? 0,
      error: submission.error,
      compileLog: submission.compileLog,
      sourceCode,
      publicCaseFeedback,
    });

    const provider = this.getDefaultProvider();
    const model = this.getDefaultModel(provider);
    const temperature = Number(this.config.get<string>(EnvKeys.AI_TEMPERATURE) ?? 0.2);
    const maxTokens = this.resolveHintMaxTokens();

    const raw = await this.generateWithRetry(provider, model, messages, temperature, maxTokens, 2);
    const hints = this.parseHintOutput(raw);
    const sanitized = sanitizeAiHintOutput(hints, publicExpectedOutputs);

    this.logger.log(
      `AI hint userId=${user.userId} problemId=${problemId} submissionId=${submission.id} provider=${provider}`,
    );

    return {
      submissionId: submission.id,
      hints: sanitized,
      provider,
      model,
    };
  }

  private async loadSourceCode(
    inline: string | null | undefined,
    objectKey: string | null | undefined,
  ): Promise<string> {
    let code = inline?.trim() ?? '';
    if (!code && objectKey) {
      try {
        code = await this.storage.getObjectString(objectKey);
      } catch {
        code = '';
      }
    }
    if (code.length > SOURCE_MAX_BYTES) {
      return code.slice(0, SOURCE_MAX_BYTES) + '\n// ... (truncated)';
    }
    return code || '(empty source)';
  }

  private extractPublicCaseFeedback(
    caseResults: CaseResultsJson | null,
    hiddenIds: Set<string>,
  ) {
    const cases = caseResults?.testCases ?? [];
    return cases
      .filter((tc) => {
        const id = tc.testCaseId ?? '';
        return !tc.isHidden && !hiddenIds.has(id);
      })
      .map((tc) => ({
        testCaseId: tc.testCaseId ?? 'unknown',
        status: tc.status ?? 'Unknown',
        passed: Boolean(tc.passed),
        input: tc.input,
        stderrOrError: tc.error ?? null,
      }));
  }

  private resolveHintMaxTokens(): number {
    const configured = Number(this.config.get<string>(EnvKeys.AI_MAX_TOKENS) ?? 4096);
    if (!Number.isFinite(configured) || configured <= 0) {
      return HINT_OUTPUT_TOKEN_FLOOR;
    }
    return Math.min(Math.max(configured, HINT_OUTPUT_TOKEN_FLOOR), HINT_OUTPUT_TOKEN_CAP);
  }

  private parseHintOutput(raw: string): AiHintOutput {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new ServiceUnavailableException(
        'Mô hình AI không trả về nội dung gợi ý. Vui lòng thử lại sau.',
      );
    }

    const jsonText = this.extractFirstJsonObject(raw) ?? trimmed;
    if (!jsonText) {
      throw new ServiceUnavailableException(
        'Mô hình AI không trả về JSON gợi ý hợp lệ. Vui lòng thử lại sau.',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      this.logger.warn(
        `AI hint JSON parse failed (length=${jsonText.length}, preview=${jsonText.slice(0, 200)})`,
      );
      throw new ServiceUnavailableException(
        'Không phân tích được phản hồi gợi ý từ AI. Vui lòng thử lại sau.',
      );
    }

    const validated = aiHintOutputSchema.safeParse(parsed);
    if (!validated.success) {
      this.logger.warn(`AI hint schema validation failed: ${validated.error.message}`);
      throw new ServiceUnavailableException(
        'Phản hồi gợi ý từ AI không đúng định dạng. Vui lòng thử lại sau.',
      );
    }
    return validated.data;
  }

  private assertNonEmptyAiText(
    text: string,
    provider: 'openai' | 'google',
    meta: { finishReason?: string; blockReason?: string },
  ): string {
    const trimmed = text.trim();
    if (trimmed) return trimmed;

    this.logger.warn(
      `AI hint empty ${provider} response finishReason=${meta.finishReason ?? 'unknown'} blockReason=${meta.blockReason ?? 'none'}`,
    );
    throw new ServiceUnavailableException(
      'Mô hình AI không trả về gợi ý (có thể do giới hạn token hoặc lọc nội dung). Vui lòng thử lại sau.',
    );
  }

  private extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaping) {
          escaping = false;
          continue;
        }
        if (ch === '\\') {
          escaping = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') {
        depth++;
        continue;
      }
      if (ch === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1).trim();
      }
    }
    return null;
  }

  private getDefaultProvider(): 'openai' | 'google' {
    const configured = (this.config.get<string>(EnvKeys.AI_DEFAULT_PROVIDER) ?? 'openai').toLowerCase();
    return configured === 'google' ? 'google' : 'openai';
  }

  private getDefaultModel(provider: 'openai' | 'google'): string {
    if (provider === 'google') {
      return (
        this.config.get<string>(EnvKeys.AI_DEFAULT_MODEL_GOOGLE) ?? 'gemini-2.5-flash'
      );
    }
    return this.config.get<string>(EnvKeys.AI_DEFAULT_MODEL_OPENAI) ?? 'gpt-4.1-mini';
  }

  private async generateWithRetry(
    provider: 'openai' | 'google',
    modelName: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    temperature: number,
    maxTokens: number,
    maxAttempts: number,
  ): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.generate(provider, modelName, messages, temperature, maxTokens);
      } catch (error) {
        lastError = error;
        if (error instanceof ServiceUnavailableException) throw error;
        if (attempt === maxAttempts) throw error;
        await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Unknown generation error');
  }

  private async generate(
    provider: 'openai' | 'google',
    modelName: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    if (provider === 'google') {
      const key = this.config.get<string>(EnvKeys.GOOGLE_GENERATIVE_AI_API_KEY);
      if (!key) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingBudget: 0 },
            },
            contents: messages.map((item) => ({
              role: item.role === 'system' ? 'user' : item.role,
              parts: [{ text: item.content }],
            })),
          }),
        },
      );
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Google AI request failed (${response.status}): ${errorBody}`);
      }
      const payload = (await response.json()) as {
        candidates?: Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string }> };
        }>;
        promptFeedback?: { blockReason?: string };
      };
      const candidate = payload.candidates?.[0];
      const text =
        candidate?.content?.parts?.map((p) => p.text ?? '').join('')?.trim() ?? '';
      return this.assertNonEmptyAiText(text, 'google', {
        finishReason: candidate?.finishReason,
        blockReason: payload.promptFeedback?.blockReason,
      });
    }

    const key = this.config.get<string>(EnvKeys.OPENAI_API_KEY);
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string };
      }>;
    };
    const choice = payload.choices?.[0];
    const text = choice?.message?.content?.trim() ?? '';
    return this.assertNonEmptyAiText(text, 'openai', {
      finishReason: choice?.finish_reason,
    });
  }
}
