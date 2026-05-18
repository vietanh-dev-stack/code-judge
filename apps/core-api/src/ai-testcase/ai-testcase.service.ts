import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProblemMode, Prisma, Role } from '@prisma/client';
import { EnvKeys } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { buildAiGeneratedTestcaseObjectKeys } from '../storage/storage-key.builder';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAiTestcaseMessages,
  generatedTestcaseSchema,
  GeneratedTestcaseOutput,
} from './ai-testcase.prompt';
import {
  AI_PROJECT_PROMPT_VERSION_DEFAULT,
  buildAiProjectTestcaseMessages,
  generatedProjectTestcaseSchema,
  GeneratedProjectTestcaseOutput,
} from './ai-project-testcase.prompt';
import { GenerateAiTestcaseDto } from './dto/generate-ai-testcase.dto';
import { GenerateAiProjectTestcaseDto } from './dto/generate-ai-project-testcase.dto';
import { GenerateAndSaveAiTestcaseDto } from './dto/generate-and-save-ai-testcase.dto';
import { QuickGenerateAiTestcaseDto } from './dto/quick-generate-ai-testcase.dto';
import { ExplainProjectTestFileDto } from './dto/explain-project-test-file.dto';
import { TestGenerateProjectSampleDto } from './dto/test-generate-project-sample.dto';
import {
  validateGeneratedProjectTestcase,
  type ProjectTestcaseValidationResult,
} from './project-testcase-output.validator';
import {
  buildExplainProjectTestFileMessages,
  projectTestFileExplanationSchema,
  type ProjectTestFileExplanation,
  validateLineBlocksAgainstSource,
} from './project-testfile-explain';
import {
  getProjectTestcaseSample,
  PROJECT_TESTCASE_SAMPLE_KEYS,
  PROJECT_TESTCASE_SAMPLES,
  type ProjectTestcaseSampleDefinition,
  type ProjectTestcaseSampleKey,
} from './project-testcase-samples';

export type ExplainProjectTestFileResult = {
  filePath: string;
  provider: 'openai' | 'google';
  model: string;
  structured: ProjectTestFileExplanation | null;
  parseError?: string;
  /** Plain-text fallback when structured parse fails */
  explanation?: string;
};

interface GenerateDraftResult {
  provider: 'openai' | 'google';
  model: string;
  promptVersion: string;
  raw: string;
  parsed: GeneratedTestcaseOutput | null;
  parseError?: string;
}

export interface GenerateProjectDraftResult {
  provider: 'openai' | 'google';
  model: string;
  promptVersion: string;
  raw: string;
  parsed: GeneratedProjectTestcaseOutput | null;
  parseError?: string;
  validation?: ProjectTestcaseValidationResult;
}

interface GenerateAndSaveResult {
  jobId: string;
  mode: ProblemMode;
  persistedTestCaseCount: number;
  provider?: 'openai' | 'google';
  model?: string;
  promptVersion?: string;
  parseError?: string;
  validation?: ProjectTestcaseValidationResult;
  problemBrief?: GeneratedProjectTestcaseOutput['problemBrief'];
}

@Injectable()
export class AiTestcaseService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async quickGenerate(input: QuickGenerateAiTestcaseDto): Promise<GenerateDraftResult> {
    return this.generateDraft({
      title: input.title,
      statement: input.statement,
      ioSpec: input.ioSpec,
      provider: input.provider,
      model: input.model,
      difficulty: 'not-specified',
      timeLimitMs: 10000,
      memoryLimitMb: 256,
      maxTestCases: 8,
    });
  }

  async generateDraft(input: GenerateAiTestcaseDto): Promise<GenerateDraftResult> {
    // Fast mode trades output richness for lower latency.
    // It disables fallback provider and lowers creativity to reduce malformed JSON risk.
    const fastMode = this.isFastModeEnabled();
    const primaryProvider = input.provider ?? this.getDefaultProvider();
    const primaryModel = input.model ?? this.getDefaultModel(primaryProvider);
    const promptVersion = this.config.get<string>(EnvKeys.AI_PROMPT_VERSION) ?? 'ai-testcase-v1';
    const requestedCases = Math.min(Math.max(input.maxTestCases ?? 10, 1), 25);
    const configuredMaxTokens = Number(this.config.get<string>(EnvKeys.AI_MAX_TOKENS) ?? 4096);
    /** Floor scales with testcase count so Gemini/OpenAI JSON is not cut mid-object. */
    const tokenFloor = 1100 + requestedCases * 320;
    const outputCap = fastMode ? 8192 : 16384;
    const maxTokens = Math.min(Math.max(configuredMaxTokens, tokenFloor), outputCap);
    const configuredTemperature = Number(this.config.get<string>(EnvKeys.AI_TEMPERATURE) ?? 0.2);
    const temperature = fastMode ? 0 : configuredTemperature;

    const messages = buildAiTestcaseMessages(input, promptVersion);
    const effectiveMessages = fastMode ? this.buildFastModeMessages(messages) : messages;
    const fallbackProvider: 'openai' | 'google' = primaryProvider === 'google' ? 'openai' : 'google';
    const fallbackModel = this.getDefaultModel(fallbackProvider);

    const plans: Array<{ provider: 'openai' | 'google'; model: string }> = fastMode
      ? [{ provider: primaryProvider, model: primaryModel }]
      : [
          { provider: primaryProvider, model: primaryModel },
          { provider: fallbackProvider, model: fallbackModel },
        ];

    // Try provider/model plans in order (primary -> fallback).
    // Track per-plan failures: HTTP errors throw, but 200 + empty body does not — treat empty as failure
    // so we can fall back and so the final error lists every attempt (not only the last catch).
    let text = '';
    let usedProvider = primaryProvider;
    let usedModel = primaryModel;
    const planFailures: string[] = [];

    for (const plan of plans) {
      try {
        const chunk = await this.generateWithRetry(
          plan.provider,
          plan.model,
          effectiveMessages,
          temperature,
          maxTokens,
          fastMode ? 1 : 3,
        );
        if (!chunk.trim()) {
          planFailures.push(`${plan.provider}/${plan.model}: empty model response`);
          continue;
        }
        text = chunk;
        usedProvider = plan.provider;
        usedModel = plan.model;
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        planFailures.push(`${plan.provider}/${plan.model}: ${msg}`);
      }
    }

    if (!text.trim()) {
      const detail = planFailures.length ? planFailures.join(' | ') : 'no attempts recorded';
      throw new Error(`All AI providers failed. ${detail}`);
    }

    let parsed: GeneratedTestcaseOutput | null = null;
    let parseError: string | undefined;
    try {
      parsed = this.parseOutput(text);
      if (parsed.testCases.length > (input.maxTestCases ?? 10)) {
        throw new Error('AI output exceeds maxTestCases');
      }
    } catch (error) {
      // If output looks truncated (usually maxOutputTokens), retry with a higher
      // token budget and compact JSON instructions — even in AI_FAST_MODE.
      if (this.isLikelyTruncatedOutput(text)) {
        const compactMessages = this.buildCompactRetryMessages(messages);
        const retryBudget = Math.min(outputCap, Math.max(maxTokens * 2, 5000));
        try {
          const retryText = await this.generateWithRetry(
            usedProvider,
            usedModel,
            compactMessages,
            0,
            retryBudget,
            1,
          );
          text = retryText;
          parsed = this.parseOutput(retryText);
          if (parsed.testCases.length > (input.maxTestCases ?? 10)) {
            throw new Error('AI output exceeds maxTestCases');
          }
          parseError = undefined;
        } catch (retryError) {
          parseError = retryError instanceof Error ? retryError.message : 'Unknown parse error';
        }
      } else {
        parseError = error instanceof Error ? error.message : 'Unknown parse error';
      }
    }

    return {
      provider: usedProvider,
      model: usedModel,
      promptVersion,
      raw: text,
      parsed,
      parseError,
    };
  }

  async generateProjectDraft(input: GenerateAiProjectTestcaseDto): Promise<GenerateProjectDraftResult> {
    const fastMode = this.isFastModeEnabled();
    const primaryProvider = input.provider ?? this.getDefaultProvider();
    const primaryModel = input.model ?? this.getDefaultModel(primaryProvider);
    const promptVersion =
      this.config.get<string>(EnvKeys.AI_PROJECT_PROMPT_VERSION) ?? AI_PROJECT_PROMPT_VERSION_DEFAULT;
    const maxTests = Math.min(Math.max(input.maxTestCases ?? 12, 1), 25);
    const configuredMaxTokens = Number(this.config.get<string>(EnvKeys.AI_MAX_TOKENS) ?? 4096);
    const tokenFloor = 2400 + maxTests * 450;
    const outputCap = fastMode ? 16384 : 32768;
    const maxTokens = Math.min(Math.max(configuredMaxTokens, tokenFloor), outputCap);
    const configuredTemperature = Number(this.config.get<string>(EnvKeys.AI_TEMPERATURE) ?? 0.2);
    const temperature = fastMode ? 0 : configuredTemperature;

    const messages = buildAiProjectTestcaseMessages(input, promptVersion);
    const effectiveMessages = fastMode ? this.buildFastModeProjectMessages(messages) : messages;
    const fallbackProvider: 'openai' | 'google' = primaryProvider === 'google' ? 'openai' : 'google';
    const fallbackModel = this.getDefaultModel(fallbackProvider);

    const plans: Array<{ provider: 'openai' | 'google'; model: string }> = fastMode
      ? [{ provider: primaryProvider, model: primaryModel }]
      : [
          { provider: primaryProvider, model: primaryModel },
          { provider: fallbackProvider, model: fallbackModel },
        ];

    let text = '';
    let usedProvider = primaryProvider;
    let usedModel = primaryModel;
    const planFailures: string[] = [];

    for (const plan of plans) {
      try {
        const chunk = await this.generateWithRetry(
          plan.provider,
          plan.model,
          effectiveMessages,
          temperature,
          maxTokens,
          fastMode ? 1 : 3,
        );
        if (!chunk.trim()) {
          planFailures.push(`${plan.provider}/${plan.model}: empty model response`);
          continue;
        }
        text = chunk;
        usedProvider = plan.provider;
        usedModel = plan.model;
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        planFailures.push(`${plan.provider}/${plan.model}: ${msg}`);
      }
    }

    if (!text.trim()) {
      const detail = planFailures.length ? planFailures.join(' | ') : 'no attempts recorded';
      throw new Error(`All AI providers failed. ${detail}`);
    }

    let parsed: GeneratedProjectTestcaseOutput | null = null;
    let parseError: string | undefined;
    let validation: ProjectTestcaseValidationResult | undefined;

    try {
      parsed = this.parseProjectOutput(text);
      validation = validateGeneratedProjectTestcase(parsed, { maxTestCases: maxTests });
      if (!validation.valid) {
        parseError = validation.issues.map((i) => `${i.code}: ${i.message}`).join('; ');
        parsed = null;
      }
    } catch (error) {
      if (this.isLikelyTruncatedOutput(text)) {
        const compactMessages = this.buildCompactRetryMessages(messages);
        const retryBudget = Math.min(outputCap, Math.max(maxTokens * 2, 8000));
        try {
          const retryText = await this.generateWithRetry(
            usedProvider,
            usedModel,
            compactMessages,
            0,
            retryBudget,
            1,
          );
          text = retryText;
          parsed = this.parseProjectOutput(retryText);
          validation = validateGeneratedProjectTestcase(parsed, { maxTestCases: maxTests });
          if (!validation.valid) {
            parseError = validation.issues.map((i) => `${i.code}: ${i.message}`).join('; ');
            parsed = null;
          } else {
            parseError = undefined;
          }
        } catch (retryError) {
          parseError = retryError instanceof Error ? retryError.message : 'Unknown parse error';
        }
      } else {
        parseError = error instanceof Error ? error.message : 'Unknown parse error';
      }
    }

    return {
      provider: usedProvider,
      model: usedModel,
      promptVersion,
      raw: text,
      parsed,
      parseError,
      validation,
    };
  }

  listProjectTestcaseSamples(): {
    samples: Array<{
      key: ProjectTestcaseSampleKey;
      label: string;
      description: string;
      dto: GenerateAiProjectTestcaseDto;
    }>;
    keys: readonly ProjectTestcaseSampleKey[];
  } {
    const samples = PROJECT_TESTCASE_SAMPLE_KEYS.map((key) => {
      const def = PROJECT_TESTCASE_SAMPLES[key];
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        dto: def.dto,
      };
    });
    return { keys: PROJECT_TESTCASE_SAMPLE_KEYS, samples };
  }

  async testGenerateProjectSample(
    input: TestGenerateProjectSampleDto,
  ): Promise<{
    mode: 'single' | 'all';
    results: Array<{
      sample: ProjectTestcaseSampleKey;
      label: string;
      ok: boolean;
      provider: string;
      model: string;
      promptVersion: string;
      parseError?: string;
      validation?: ProjectTestcaseValidationResult;
      problemBrief?: GeneratedProjectTestcaseOutput['problemBrief'];
      testCount?: number;
      fileCount?: number;
      /** Raw JSON string từ model — có thể rất dài khi debug */
      rawPreview?: string;
    }>;
  }> {
    const keys: ProjectTestcaseSampleKey[] = input.sample
      ? [input.sample]
      : [...PROJECT_TESTCASE_SAMPLE_KEYS];

    const results: Array<{
      sample: ProjectTestcaseSampleKey;
      label: string;
      ok: boolean;
      provider: string;
      model: string;
      promptVersion: string;
      parseError?: string;
      validation?: ProjectTestcaseValidationResult;
      problemBrief?: GeneratedProjectTestcaseOutput['problemBrief'];
      testCount?: number;
      fileCount?: number;
      rawPreview?: string;
    }> = [];

    for (const key of keys) {
      const def: ProjectTestcaseSampleDefinition = getProjectTestcaseSample(key);
      const dto: GenerateAiProjectTestcaseDto = {
        ...def.dto,
        ...(input.provider ? { provider: input.provider } : {}),
        ...(input.model ? { model: input.model } : {}),
      };

      try {
        const generated = await this.generateProjectDraft(dto);
        const ok = Boolean(generated.parsed) && (generated.validation?.valid ?? false);
        results.push({
          sample: key,
          label: def.label,
          ok,
          provider: generated.provider,
          model: generated.model,
          promptVersion: generated.promptVersion,
          parseError: generated.parseError,
          validation: generated.validation,
          problemBrief: generated.parsed?.problemBrief,
          testCount: generated.parsed?.testManifest.length,
          fileCount: generated.parsed?.files.length,
          rawPreview: generated.raw.length > 4000 ? `${generated.raw.slice(0, 4000)}…` : generated.raw,
        });
      } catch (error) {
        results.push({
          sample: key,
          label: def.label,
          ok: false,
          provider: input.provider ?? this.getDefaultProvider(),
          model: input.model ?? this.getDefaultModel(input.provider ?? this.getDefaultProvider()),
          promptVersion:
            this.config.get<string>(EnvKeys.AI_PROJECT_PROMPT_VERSION) ??
            AI_PROJECT_PROMPT_VERSION_DEFAULT,
          parseError: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      mode: input.sample ? 'single' : 'all',
      results,
    };
  }

  async explainProjectTestFile(dto: ExplainProjectTestFileDto): Promise<ExplainProjectTestFileResult> {
    const provider = dto.provider ?? this.getDefaultProvider();
    const model = dto.model ?? this.getDefaultModel(provider);
    const totalLines = Math.max(1, dto.fileContent.split('\n').length);

    const messages = buildExplainProjectTestFileMessages({
      filePath: dto.filePath,
      fileContent: dto.fileContent,
      problemSummary: dto.problemSummary,
      relatedTestsJson: dto.relatedTestsJson,
    });

    const text = await this.generateWithRetry(provider, model, messages, 0.2, 4096, 2);

    try {
      const json = JSON.parse(this.extractFirstJsonObject(text) ?? text) as unknown;
      const structured = projectTestFileExplanationSchema.parse(json);
      const blockIssues = validateLineBlocksAgainstSource(structured, totalLines);
      return {
        filePath: dto.filePath,
        provider,
        model,
        structured,
        ...(blockIssues.length > 0 ? { parseError: blockIssues.join('; ') } : {}),
      };
    } catch (error) {
      const parseError = error instanceof Error ? error.message : 'Unknown parse error';
      return {
        filePath: dto.filePath,
        provider,
        model,
        structured: null,
        parseError,
        explanation: text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim(),
      };
    }
  }

  private formatExplanationAsText(structured: ProjectTestFileExplanation): string {
    const parts = [
      `Mục đích file: ${structured.filePurpose}`,
      `Tương tác code SV: ${structured.studentCodeInteraction}`,
      '',
      'Theo dòng:',
      ...structured.lineBlocks.map(
        (b) =>
          `  Dòng ${b.lineStart}-${b.lineEnd} — ${b.label}: ${b.responsibility}`,
      ),
    ];
    if (structured.testBreakdown.length) {
      parts.push('', 'Test case:');
      for (const t of structured.testBreakdown) {
        const range =
          t.lineStart && t.lineEnd ? ` (dòng ${t.lineStart}-${t.lineEnd})` : '';
        parts.push(`  • ${t.testName}${range}: ${t.validates}`);
      }
    }
    return parts.join('\n');
  }

  async generateAndSave(input: GenerateAndSaveAiTestcaseDto, user: RequestUser): Promise<GenerateAndSaveResult> {
    const problem = await this.prisma.problem.findUnique({
      where: { id: input.problemId },
      select: {
        id: true,
        creatorId: true,
        title: true,
        mode: true,
        difficulty: true,
        statementMd: true,
        description: true,
        timeLimitMs: true,
        memoryLimitMb: true,
        supportedLanguages: true,
        maxTestCases: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }
    this.assertUserCanManageProblemAi(problem.creatorId, user);

    const promptVersion = this.config.get<string>(EnvKeys.AI_PROMPT_VERSION) ?? 'ai-testcase-v1';
    const createdJob = await this.prisma.aiGenerationJob.create({
      data: {
        problemId: problem.id,
        createdById: user.userId,
        status: 'PENDING',
        promptVersion,
      },
    });

    if (problem.mode === ProblemMode.PROJECT) {
      await this.prisma.aiGenerationJob.update({
        where: { id: createdJob.id },
        data: { status: 'RUNNING' },
      });

      const projectPromptVersion =
        this.config.get<string>(EnvKeys.AI_PROJECT_PROMPT_VERSION) ?? AI_PROJECT_PROMPT_VERSION_DEFAULT;

      const generated = await this.generateProjectDraft({
        title: problem.title,
        statement: problem.statementMd ?? problem.description ?? '',
        difficulty: problem.difficulty,
        stack: input.stack ?? this.inferProjectStack(problem.supportedLanguages),
        framework: input.framework,
        maxTestCases: Math.min(input.maxTestCases ?? problem.maxTestCases ?? 12, 25),
        supplementaryText: input.supplementaryText,
        rubric: input.rubric,
        goldenSummary: input.goldenSummary,
        provider: input.provider,
        model: input.model,
      });

      if (!generated.parsed) {
        await this.prisma.aiGenerationJob.update({
          where: { id: createdJob.id },
          data: {
            status: 'FAILED',
            promptVersion: projectPromptVersion,
            errorMessage: generated.parseError ?? 'Failed to parse or validate project testcase output',
            structuredOutput: {
              mode: 'PROJECT',
              raw: generated.raw,
              parseError: generated.parseError,
              validation: generated.validation,
            },
          },
        });

        return {
          jobId: createdJob.id,
          mode: ProblemMode.PROJECT,
          persistedTestCaseCount: 0,
          provider: generated.provider,
          model: generated.model,
          promptVersion: generated.promptVersion,
          parseError: generated.parseError,
          validation: generated.validation,
        };
      }

      const existingMax = await this.prisma.testCase.aggregate({
        where: { problemId: problem.id },
        _max: { orderIndex: true },
      });
      const nextOrderIndex = (existingMax._max.orderIndex ?? -1) + 1;

      const testcaseRows = generated.parsed.testManifest.map((item, idx) => ({
        problemId: problem.id,
        orderIndex: nextOrderIndex + idx,
        input: item.testName,
        expectedOutput: JSON.stringify({
          type: 'PROJECT_TEST_META',
          filePath: item.filePath,
          suite: item.suite,
          requirementIds: item.requirementIds,
          rationale: item.rationale,
        }),
        isHidden: item.isHidden ?? true,
        weight: item.weight ?? 1,
      }));

      await this.prisma.$transaction([
        this.prisma.testCase.createMany({ data: testcaseRows }),
        this.prisma.aiGenerationJob.update({
          where: { id: createdJob.id },
          data: {
            status: 'SUCCEEDED',
            promptVersion: generated.promptVersion,
            structuredOutput: {
              mode: 'PROJECT',
              provider: generated.provider,
              model: generated.model,
              promptVersion: generated.promptVersion,
              problemBrief: generated.parsed.problemBrief,
              testManifest: generated.parsed.testManifest,
              runConfig: generated.parsed.runConfig,
              fileCount: generated.parsed.files.length,
              files: generated.parsed.files,
              validation: generated.validation,
              raw: generated.raw,
            },
          },
        }),
      ]);

      return {
        jobId: createdJob.id,
        mode: ProblemMode.PROJECT,
        persistedTestCaseCount: testcaseRows.length,
        provider: generated.provider,
        model: generated.model,
        promptVersion: generated.promptVersion,
        problemBrief: generated.parsed.problemBrief,
        validation: generated.validation,
      };
    }

    await this.prisma.aiGenerationJob.update({
      where: { id: createdJob.id },
      data: { status: 'RUNNING' },
    });

    // Reuse generateDraft so prompt build, provider routing, retries, and parser logic
    // stay in one place and remain behaviorally consistent.
    const generated = await this.generateDraft({
      title: problem.title,
      statement: problem.statementMd ?? problem.description ?? '',
      difficulty: problem.difficulty,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      supportedLanguages: Array.isArray(problem.supportedLanguages)
        ? (problem.supportedLanguages as string[])
        : undefined,
      maxTestCases: input.maxTestCases ?? problem.maxTestCases,
      ioSpec: input.ioSpec,
      supplementaryText: input.supplementaryText,
      provider: input.provider,
      model: input.model,
    });

    // If model output cannot be parsed to schema, keep raw payload for debugging/review.
    if (!generated.parsed) {
      await this.prisma.aiGenerationJob.update({
        where: { id: createdJob.id },
        data: {
          status: 'FAILED',
          errorMessage: generated.parseError ?? 'Failed to parse generated output',
          structuredOutput: {
            raw: generated.raw,
            parseError: generated.parseError ?? 'unknown parse error',
          },
        },
      });

      return {
        jobId: createdJob.id,
        mode: ProblemMode.ALGO,
        persistedTestCaseCount: 0,
        provider: generated.provider,
        model: generated.model,
        promptVersion: generated.promptVersion,
        parseError: generated.parseError,
      };
    }

    const existingMax = await this.prisma.testCase.aggregate({
      where: { problemId: problem.id },
      _max: { orderIndex: true },
    });
    const nextOrderIndex = (existingMax._max.orderIndex ?? -1) + 1;
    // Append new cases after existing orderIndex to avoid clashing unique(problemId, orderIndex).
    const testcaseRows = generated.parsed.testCases.map((testCase, idx) => ({
      problemId: problem.id,
      orderIndex: nextOrderIndex + idx,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isHidden: testCase.isHidden ?? false,
      weight: testCase.weight ?? 1,
    }));

    // Persist generated testcases and mark the AI job as succeeded in one transaction.
    await this.prisma.$transaction([
      this.prisma.testCase.createMany({ data: testcaseRows }),
      this.prisma.aiGenerationJob.update({
        where: { id: createdJob.id },
        data: {
          status: 'SUCCEEDED',
          promptVersion: generated.promptVersion,
          structuredOutput: {
            provider: generated.provider,
            model: generated.model,
            promptVersion: generated.promptVersion,
            parsed: generated.parsed,
            raw: generated.raw,
          },
        },
      }),
    ]);

    return {
      jobId: createdJob.id,
      mode: ProblemMode.ALGO,
      persistedTestCaseCount: testcaseRows.length,
      provider: generated.provider,
      model: generated.model,
      promptVersion: generated.promptVersion,
    };
  }

  async listProblemDocuments(problemId: string, user: RequestUser) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, creatorId: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const baseWhere: Prisma.AiGenerationJobWhereInput = {
      problemId,
      inputDocObjectKey: {
        not: null,
      },
    };

    const where: Prisma.AiGenerationJobWhereInput =
      user.role === Role.ADMIN || problem.creatorId === user.userId
        ? baseWhere
        : { ...baseWhere, createdById: user.userId };

    const jobs = await this.prisma.aiGenerationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        inputDocObjectKey: true,
        inputDocUrl: true,
        inputDocFileName: true,
        inputDocContentType: true,
        inputDocSizeBytes: true,
      },
    });

    return {
      problemId,
      documents: jobs.map((job) => ({
        jobId: job.id,
        uploadedAt: job.createdAt,
        objectKey: job.inputDocObjectKey,
        fileName: job.inputDocFileName,
        contentType: job.inputDocContentType,
        sizeBytes: job.inputDocSizeBytes,
        viewUrl:
          job.inputDocUrl ??
          (job.inputDocObjectKey ? this.storage.getObjectUrl(job.inputDocObjectKey) : null),
      })),
    };
  }

  async getJobDocumentDownload(jobId: string, user: RequestUser, expiresInSeconds?: number) {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        problemId: true,
        createdById: true,
        inputDocObjectKey: true,
        inputDocUrl: true,
        inputDocFileName: true,
        inputDocContentType: true,
        inputDocSizeBytes: true,
      },
    });

    if (!job) {
      throw new NotFoundException('AI generation job not found');
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: job.problemId },
      select: { creatorId: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const allowed =
      user.role === Role.ADMIN ||
      job.createdById === user.userId ||
      problem.creatorId === user.userId;
    if (!allowed) {
      throw new ForbiddenException('Không có quyền tải tài liệu job này');
    }

    if (!job.inputDocObjectKey) {
      throw new NotFoundException('No input document has been attached to this job');
    }

    const downloadUrl = await this.storage.createPresignedDownloadUrl(
      job.inputDocObjectKey,
      expiresInSeconds ?? 900,
    );

    return {
      jobId: job.id,
      objectKey: job.inputDocObjectKey,
      fileName: job.inputDocFileName,
      contentType: job.inputDocContentType,
      sizeBytes: job.inputDocSizeBytes,
      viewUrl: job.inputDocUrl ?? this.storage.getObjectUrl(job.inputDocObjectKey),
      downloadUrl,
      expiresInSeconds: expiresInSeconds ?? 900,
    };
  }

  private assertUserCanManageProblemAi(creatorId: string | null, user: RequestUser): void {
    if (user.role === Role.ADMIN) return;
    if (creatorId === null || creatorId === user.userId) return;
    throw new ForbiddenException(
      'Chỉ chủ đề (creator) hoặc admin mới có thể chạy AI generate-and-save trên problem này',
    );
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
        const retryable = this.isRetryableError(error);
        if (!retryable || attempt === maxAttempts) {
          throw error;
        }
        await this.delay(300 * 2 ** (attempt - 1));
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
      if (!key) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
      }
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
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (
        payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')?.trim() ?? ''
      );
    }

    const key = this.config.get<string>(EnvKeys.OPENAI_API_KEY);
    if (!key) {
      throw new Error('OPENAI_API_KEY is not set');
    }
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
        messages: messages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content?.trim() ?? '';
  }

  private parseProjectOutput(raw: string): GeneratedProjectTestcaseOutput {
    const normalized = raw.trim().replace(/^\uFEFF/, '');
    const candidates = this.collectJsonCandidates(normalized);

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const json = JSON.parse(candidate) as unknown;
        return generatedProjectTestcaseSchema.parse(json);
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Failed to parse PROJECT AI output as JSON. Last error: ${
        lastError instanceof Error ? lastError.message : 'unknown parse error'
      }`,
    );
  }

  private parseOutput(raw: string): GeneratedTestcaseOutput {
    // Model responses can contain markdown fences or stray prose.
    // We try multiple normalized candidates before failing hard.
    const normalized = raw.trim().replace(/^\uFEFF/, '');
    const candidates = this.collectJsonCandidates(normalized);

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const json = JSON.parse(candidate) as unknown;
        return generatedTestcaseSchema.parse(json);
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Failed to parse AI output as JSON. Last error: ${
        lastError instanceof Error ? lastError.message : 'unknown parse error'
      }`,
    );
  }

  private collectJsonCandidates(normalized: string): string[] {
    const fencedBlocks = [...normalized.matchAll(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```/g)].map(
      (match) => match[1]?.trim(),
    );

    const candidates: string[] = [];
    for (const block of fencedBlocks) {
      if (block) {
        candidates.push(block);
      }
    }

    const deFenced = normalized
      .replace(/^```[a-zA-Z0-9_-]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    if (deFenced !== normalized) {
      candidates.push(deFenced);
    }

    const stripAllFences = normalized.replace(/```[a-zA-Z0-9_-]*\s*|```/g, '').trim();
    if (stripAllFences && stripAllFences !== normalized) {
      candidates.push(stripAllFences);
    }

    const extractedJsonObject = this.extractFirstJsonObject(normalized);
    if (extractedJsonObject) {
      candidates.push(extractedJsonObject);
    }

    candidates.push(normalized);
    return candidates;
  }

  private inferProjectStack(
    supportedLanguages: unknown,
  ): 'backend' | 'frontend' | 'fullstack' {
    if (!Array.isArray(supportedLanguages)) {
      return 'backend';
    }
    const langs = supportedLanguages.map((l) => String(l).toLowerCase());
    const hasJs = langs.some((l) => l.includes('javascript') || l.includes('typescript') || l === 'js');
    const hasFe = langs.some((l) => l.includes('react') || l.includes('frontend') || l.includes('next'));
    if (hasFe) {
      return hasJs ? 'fullstack' : 'frontend';
    }
    return 'backend';
  }

  private buildFastModeProjectMessages(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const fastInstruction =
      '\nFAST MODE: Return compact valid JSON only. problemBrief with 3-5 FR-* must items. testManifest 4-6 tests max. Keep file content minimal but runnable.';
    return messages.map((message, index) =>
      index === 0
        ? { ...message, content: `${message.content}${fastInstruction}` }
        : message,
    );
  }

  private extractFirstJsonObject(text: string): string | null {
    // Streaming-style scanner that respects string escaping,
    // so braces inside string literals do not break balance counting.
    const start = text.indexOf('{');
    if (start < 0) {
      return null;
    }

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
        if (ch === '"') {
          inString = false;
        }
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
        if (depth === 0) {
          return text.slice(start, i + 1).trim();
        }
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
      return this.config.get<string>(EnvKeys.AI_DEFAULT_MODEL_GOOGLE) ?? 'gemini-2.5-flash';
    }
    return this.config.get<string>(EnvKeys.AI_DEFAULT_MODEL_OPENAI) ?? 'gpt-4.1-mini';
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return /(429|500|502|503|504|UNAVAILABLE|timeout|temporar)/i.test(error.message);
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildCompactRetryMessages(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const compactInstruction =
      '\nReturn valid compact JSON only (no markdown, no code fence, no explanation). Keep output concise.';
    return messages.map((message, index) =>
      index === 0
        ? { ...message, content: `${message.content}${compactInstruction}` }
        : message,
    );
  }

  private buildFastModeMessages(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const fastInstruction =
      '\nFAST MODE: prioritize response speed. Return concise compact JSON only. Limit to 3-5 high-value testcases. Keep explanations empty or very short.';
    return messages.map((message, index) =>
      index === 0
        ? { ...message, content: `${message.content}${fastInstruction}` }
        : message,
    );
  }

  private isLikelyTruncatedOutput(raw: string): boolean {
    const text = raw.trim();
    if (!text) {
      return false;
    }

    // Obvious truncation signals.
    if (!/[}\]]\s*```?\s*$/.test(text) && /"[^"]*$/.test(text)) {
      return true;
    }

    let brace = 0;
    let bracket = 0;
    let inString = false;
    let escaping = false;

    for (const ch of text) {
      if (inString) {
        if (escaping) {
          escaping = false;
          continue;
        }
        if (ch === '\\') {
          escaping = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') brace++;
      if (ch === '}') brace--;
      if (ch === '[') bracket++;
      if (ch === ']') bracket--;
    }

    return inString || brace > 0 || bracket > 0;
  }

  private isFastModeEnabled(): boolean {
    const raw = (this.config.get<string>(EnvKeys.AI_FAST_MODE) ?? '').toLowerCase().trim();
    return ['1', 'true', 'yes', 'on'].includes(raw);
  }
}
