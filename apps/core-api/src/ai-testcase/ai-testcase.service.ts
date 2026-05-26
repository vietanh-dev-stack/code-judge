import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProblemMode, Prisma, Role } from '@prisma/client';
import {
  buildAiLlmPlans,
  EnvKeys,
  resolveAiDefaultModel,
  resolveAiDefaultProvider,
  type AiLlmPlan,
} from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { ProblemStorageAccessService } from '../storage/problem-storage-access.service';
import { buildAiGeneratedTestcaseObjectKeys } from '../storage/storage-key.builder';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAiTestcaseMessages,
  generatedTestcaseSchema,
  GeneratedTestcaseOutput,
} from './ai-testcase.prompt';
import {
  enrichProblemStatementWithSuggestedLimits,
  enrichTestcaseDraftWithSuggestedLimits,
} from './ai-suggested-limits.util';
import {
  buildTestgenBriefMessages,
  testgenBriefSchema,
  type TestgenBrief,
} from './ai-testcase-brief.prompt';
import {
  FAST_MODE_AUTO_MAX_CASES,
  FAST_MODE_AUTO_MAX_STATEMENT,
  LONG_STATEMENT_THRESHOLD,
} from './ai-testcase-generation.constants';
import {
  buildPlaceholderWarningMessage,
  findPlaceholderCaseIndexes,
  problemNeedsFullIo,
} from './ai-testcase-io-quality.util';
import {
  AI_PROJECT_PROMPT_VERSION_DEFAULT,
  buildAiProjectTestcaseMessages,
  generatedProjectTestcaseSchema,
  GeneratedProjectTestcaseOutput,
} from './ai-project-testcase.prompt';
import { GenerateAiProblemStatementDto } from './dto/generate-ai-problem-statement.dto';
import { GenerateAiTestcaseDto } from './dto/generate-ai-testcase.dto';
import {
  AI_PROBLEM_STATEMENT_PROMPT_VERSION,
  buildAiProblemStatementMessages,
  generatedProblemStatementSchema,
  type GeneratedProblemStatementOutput,
} from './ai-problem-statement.prompt';
import { GenerateAiProjectTestcaseDto } from './dto/generate-ai-project-testcase.dto';
import { GenerateAndSaveAiTestcaseDto } from './dto/generate-and-save-ai-testcase.dto';
import { QuickGenerateAiTestcaseDto } from './dto/quick-generate-ai-testcase.dto';
import { AnalyzeGoldenVerifyFailuresDto } from './dto/analyze-golden-verify-failures.dto';
import { ExplainProjectTestFileDto } from './dto/explain-project-test-file.dto';
import { assertCanAnalyzeGoldenVerifyFailures } from './ai-testcase-problem-auth.util';
import {
  buildGoldenVerifyFailureDiagnoseMessages,
  goldenVerifyFailureDiagnosisSchema,
  type GoldenVerifyFailureDiagnosis,
} from './golden-verify-failure-diagnose.prompt';
import { reconcileGoldenVerifyFailureDiagnosis } from './golden-verify-diagnosis-reconcile.util';
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

export type AnalyzeGoldenVerifyFailuresResult = {
  provider: 'openai' | 'google';
  model: string;
  structured: GoldenVerifyFailureDiagnosis | null;
  parseError?: string;
  rawPreview?: string;
};

export interface GenerateDraftResult {
  provider: 'openai' | 'google';
  model: string;
  promptVersion: string;
  raw: string;
  parsed: GeneratedTestcaseOutput | null;
  parseError?: string;
  statementCharCount?: number;
  generationMode?: 'direct' | 'summarized';
  truncationSuspected?: boolean;
  maxTokensUsed?: number;
  longStatementWarning?: boolean;
  placeholderWarnings?: string[];
}

export interface GenerateProblemStatementResult {
  provider: 'openai' | 'google';
  model: string;
  promptVersion: string;
  raw: string;
  parsed: GeneratedProblemStatementOutput | null;
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
    private readonly problemStorageAccess: ProblemStorageAccessService,
  ) {}

  async generateProblemStatement(
    input: GenerateAiProblemStatementDto,
  ): Promise<GenerateProblemStatementResult> {
    const topic = input.topic?.trim() ?? '';
    if (!topic) {
      throw new BadRequestException('topic không được trống');
    }

    const primaryProvider = input.provider ?? resolveAiDefaultProvider(this.config);
    const primaryModel = input.model ?? resolveAiDefaultModel(this.config, primaryProvider);
    const maxTokens = Math.min(
      Math.max(Number(this.config.get<string>(EnvKeys.AI_MAX_TOKENS) ?? 4096), 4096),
      16384,
    );
    const temperature = Number(this.config.get<string>(EnvKeys.AI_TEMPERATURE) ?? 0.3);

    const messages = buildAiProblemStatementMessages({ ...input, topic });
    const plans = buildAiLlmPlans(this.config, {
      provider: primaryProvider,
      model: primaryModel,
    });

    let text: string;
    let usedProvider: 'openai' | 'google';
    let usedModel: string;
    try {
      const run = await this.runLlmPlans(plans, messages, temperature, maxTokens, 2);
      text = run.text;
      usedProvider = run.provider;
      usedModel = run.model;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(detail);
    }

    let parsed: GeneratedProblemStatementOutput | null = null;
    let parseError: string | undefined;
    try {
      parsed = this.parseProblemStatementOutput(text);
      if (parsed) {
        const limits = enrichProblemStatementWithSuggestedLimits(parsed);
        parsed = {
          ...parsed,
          suggestedTimeLimitMs: limits.suggestedTimeLimitMs,
          suggestedMemoryLimitMb: limits.suggestedMemoryLimitMb,
        };
      }
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Unknown parse error';
    }

    return {
      provider: usedProvider,
      model: usedModel,
      promptVersion: AI_PROBLEM_STATEMENT_PROMPT_VERSION,
      raw: text,
      parsed,
      parseError,
    };
  }

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
    const statementCharCount = input.statement.length;
    const longStatement = statementCharCount > LONG_STATEMENT_THRESHOLD;
    const requestedCases = Math.min(Math.max(input.maxTestCases ?? 10, 1), 25);
    const fastMode = this.resolveFastModeEnabled(statementCharCount, requestedCases);
    const needsFullIo =
      input.preferFullIoOutput === true ||
      problemNeedsFullIo(input.statement, input.ioSpec);
    const compactOutput = input.preferCompactOutput === true && !needsFullIo;

    const primaryProvider = input.provider ?? resolveAiDefaultProvider(this.config);
    const primaryModel = input.model ?? resolveAiDefaultModel(this.config, primaryProvider);
    const promptVersion = this.config.get<string>(EnvKeys.AI_PROMPT_VERSION) ?? 'ai-testcase-v1';

    let generationMode: 'direct' | 'summarized' = 'direct';
    let testgenBrief: TestgenBrief | undefined;

    if (longStatement) {
      testgenBrief = await this.extractTestgenBrief(input, primaryProvider, primaryModel);
      generationMode = testgenBrief ? 'summarized' : 'direct';
    }

    const messageOptions = {
      testgenBrief,
      statementExcerpt: longStatement ? input.statement.slice(0, 600) : undefined,
      omitExplanations: compactOutput || requestedCases > 6,
      compactOutput,
      requireFullIo: needsFullIo,
    };

    const dtoForMessages =
      longStatement && !testgenBrief
        ? {
            ...input,
            statement: `${input.statement.slice(0, 12_000)}\n\n[... đề đã rút gọn — phần còn lại bỏ qua để sinh testcase ...]`,
          }
        : input;

    const messages = buildAiTestcaseMessages(dtoForMessages, promptVersion, messageOptions);
    const outputCap = this.resolveOutputCap(fastMode, longStatement, needsFullIo);
    const maxTokens = this.computeTestcaseMaxTokens(
      input.statement.length,
      requestedCases,
      outputCap,
    );
    const configuredTemperature = Number(this.config.get<string>(EnvKeys.AI_TEMPERATURE) ?? 0.2);
    const temperature = fastMode ? 0 : configuredTemperature;

    const genResult = await this.runTestcaseLlmGeneration({
      messages,
      fastMode,
      primaryProvider,
      primaryModel,
      temperature,
      maxTokens,
      outputCap,
    });

    const maxCases = input.maxTestCases ?? 10;
    let parseOutcome = await this.parseTestcaseOutputWithRetries({
      text: genResult.text,
      usedProvider: genResult.provider,
      usedModel: genResult.model,
      messages,
      maxCases,
      outputCap,
      initialMaxTokens: maxTokens,
      requireFullIo: needsFullIo,
    });

    let placeholderWarnings: string[] = [];
    if (parseOutcome.parsed) {
      const placeholderIndexes = findPlaceholderCaseIndexes(parseOutcome.parsed.testCases);
      if (placeholderIndexes.length > 0) {
        placeholderWarnings = [buildPlaceholderWarningMessage(placeholderIndexes)];
        if (needsFullIo) {
          const retryOutcome = await this.retryDraftForFullIo({
            messages,
            usedProvider: genResult.provider,
            usedModel: genResult.model,
            maxCases,
            outputCap,
            maxTokens,
          });
          if (retryOutcome) {
            const retryBad = retryOutcome.parsed
              ? findPlaceholderCaseIndexes(retryOutcome.parsed.testCases)
              : placeholderIndexes;
            if (retryBad.length < placeholderIndexes.length) {
              parseOutcome = retryOutcome;
              placeholderWarnings =
                retryBad.length > 0
                  ? [buildPlaceholderWarningMessage(retryBad)]
                  : [];
            }
          }
        }
      }
    }

    const enrichedParsed = parseOutcome.parsed
      ? enrichTestcaseDraftWithSuggestedLimits(input, parseOutcome.parsed)
      : null;

    return {
      provider: genResult.provider,
      model: genResult.model,
      promptVersion,
      raw: parseOutcome.text,
      parsed: enrichedParsed,
      parseError: parseOutcome.parseError,
      statementCharCount,
      generationMode,
      truncationSuspected: parseOutcome.truncationSuspected,
      maxTokensUsed: parseOutcome.maxTokensUsed,
      longStatementWarning: longStatement,
      placeholderWarnings: placeholderWarnings.length ? placeholderWarnings : undefined,
    };
  }

  private async extractTestgenBrief(
    input: GenerateAiTestcaseDto,
    provider: 'openai' | 'google',
    model: string,
  ): Promise<TestgenBrief | undefined> {
    const briefMessages = buildTestgenBriefMessages({
      title: input.title,
      statement: input.statement,
      ioSpec: input.ioSpec,
    });
    const briefTokens = Math.min(4096, 1200 + Math.floor(input.statement.length / 20));
    const plans = buildAiLlmPlans(this.config, { provider, model });
    try {
      const { text: raw } = await this.runLlmPlans(plans, briefMessages, 0.15, briefTokens, 2);
      const json = JSON.parse(this.extractFirstJsonObject(raw) ?? raw) as unknown;
      return testgenBriefSchema.parse(json);
    } catch {
      return undefined;
    }
  }

  private computeTestcaseMaxTokens(
    statementLength: number,
    requestedCases: number,
    outputCap: number,
  ): number {
    const configuredMaxTokens = Number(this.config.get<string>(EnvKeys.AI_MAX_TOKENS) ?? 4096);
    const tokenFloor = 1100 + requestedCases * 320;
    const inputBonus = Math.min(Math.floor(statementLength / 8), 6000);
    return Math.min(Math.max(configuredMaxTokens, tokenFloor + inputBonus), outputCap);
  }

  private resolveOutputCap(
    fastMode: boolean,
    longStatement: boolean,
    needsFullIo = false,
  ): number {
    if (fastMode) return needsFullIo ? 12288 : 8192;
    if (needsFullIo) return 32768;
    if (longStatement) return 24576;
    return 16384;
  }

  private async runTestcaseLlmGeneration(params: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    fastMode: boolean;
    primaryProvider: 'openai' | 'google';
    primaryModel: string;
    temperature: number;
    maxTokens: number;
    outputCap: number;
  }): Promise<{ text: string; provider: 'openai' | 'google'; model: string }> {
    const effectiveMessages = params.fastMode
      ? this.buildFastModeMessages(params.messages)
      : params.messages;
    const plans = buildAiLlmPlans(this.config, {
      provider: params.primaryProvider,
      model: params.primaryModel,
      sameProviderOnly: params.fastMode,
    });

    return this.runLlmPlans(
      plans,
      effectiveMessages,
      params.temperature,
      params.maxTokens,
      params.fastMode ? 1 : 3,
    );
  }

  private async parseTestcaseOutputWithRetries(params: {
    text: string;
    usedProvider: 'openai' | 'google';
    usedModel: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    maxCases: number;
    outputCap: number;
    initialMaxTokens: number;
    requireFullIo?: boolean;
  }): Promise<{
    text: string;
    parsed: GeneratedTestcaseOutput | null;
    parseError?: string;
    truncationSuspected: boolean;
    maxTokensUsed: number;
  }> {
    let text = params.text;
    let maxTokensUsed = params.initialMaxTokens;
    let truncationSuspected = this.isLikelyTruncatedOutput(text);

    const tryParse = (): GeneratedTestcaseOutput => {
      const parsed = this.parseOutput(text);
      if (parsed.testCases.length > params.maxCases) {
        throw new Error('AI output exceeds maxTestCases');
      }
      return parsed;
    };

    try {
      return {
        text,
        parsed: tryParse(),
        truncationSuspected: false,
        maxTokensUsed,
      };
    } catch (firstError) {
      if (!this.isLikelyTruncatedOutput(text)) {
        return {
          text,
          parsed: null,
          parseError: firstError instanceof Error ? firstError.message : 'Unknown parse error',
          truncationSuspected: false,
          maxTokensUsed,
        };
      }

      truncationSuspected = true;
      const compactMessages = params.requireFullIo
        ? this.buildFullIoRetryMessages(params.messages)
        : this.buildCompactRetryMessages(params.messages);
      const retryBudget = Math.min(
        params.outputCap,
        Math.max(maxTokensUsed * 2, params.requireFullIo ? 12000 : 6000),
      );
      maxTokensUsed = retryBudget;
      try {
        const retryText = await this.generateWithRetry(
          params.usedProvider,
          params.usedModel,
          compactMessages,
          0,
          retryBudget,
          1,
        );
        text = retryText;
        return {
          text,
          parsed: tryParse(),
          truncationSuspected: false,
          maxTokensUsed,
        };
      } catch (retryError) {
        return {
          text,
          parsed: null,
          parseError: retryError instanceof Error ? retryError.message : 'Unknown parse error',
          truncationSuspected,
          maxTokensUsed,
        };
      }
    }
  }

  async generateProjectDraft(input: GenerateAiProjectTestcaseDto): Promise<GenerateProjectDraftResult> {
    const statementLen = input.statement?.length ?? 0;
    const maxTests = Math.min(Math.max(input.maxTestCases ?? 12, 1), 25);
    const fastMode = this.resolveFastModeEnabled(statementLen, maxTests);
    const primaryProvider = input.provider ?? resolveAiDefaultProvider(this.config);
    const primaryModel = input.model ?? resolveAiDefaultModel(this.config, primaryProvider);
    const promptVersion =
      this.config.get<string>(EnvKeys.AI_PROJECT_PROMPT_VERSION) ?? AI_PROJECT_PROMPT_VERSION_DEFAULT;
    const configuredMaxTokens = Number(this.config.get<string>(EnvKeys.AI_MAX_TOKENS) ?? 4096);
    const tokenFloor = 2400 + maxTests * 450;
    const outputCap = fastMode ? 16384 : 32768;
    const maxTokens = Math.min(Math.max(configuredMaxTokens, tokenFloor), outputCap);
    const configuredTemperature = Number(this.config.get<string>(EnvKeys.AI_TEMPERATURE) ?? 0.2);
    const temperature = fastMode ? 0 : configuredTemperature;

    const messages = buildAiProjectTestcaseMessages(input, promptVersion);
    const effectiveMessages = fastMode ? this.buildFastModeProjectMessages(messages) : messages;
    const plans = buildAiLlmPlans(this.config, {
      provider: primaryProvider,
      model: primaryModel,
      sameProviderOnly: fastMode,
    });

    const {
      text: initialText,
      provider: usedProvider,
      model: usedModel,
    } = await this.runLlmPlans(
      plans,
      effectiveMessages,
      temperature,
      maxTokens,
      fastMode ? 1 : 3,
    );
    let text = initialText;

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
          provider: input.provider ?? resolveAiDefaultProvider(this.config),
          model:
            input.model ??
            resolveAiDefaultModel(
              this.config,
              input.provider ?? resolveAiDefaultProvider(this.config),
            ),
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

  async analyzeGoldenVerifyFailures(
    dto: AnalyzeGoldenVerifyFailuresDto,
    user: RequestUser,
  ): Promise<AnalyzeGoldenVerifyFailuresResult> {
    await assertCanAnalyzeGoldenVerifyFailures(user, dto.problemId, this.prisma);

    const failed = dto.verifyResult.results.filter((r) => !r.passed);
    if (failed.length === 0) {
      throw new BadRequestException('verifyResult không có test case FAIL — không cần phân tích');
    }
    if (dto.verifyResult.summary.failed < 1) {
      throw new BadRequestException('summary.failed phải >= 1');
    }

    let title = dto.title?.trim() ?? '';
    let statement = dto.statement?.trim() ?? '';
    const ioSpec = dto.ioSpec?.trim() ?? '';

    if (dto.problemId) {
      const problem = await this.prisma.problem.findUnique({
        where: { id: dto.problemId },
        select: { title: true, statementMd: true, description: true },
      });
      if (!problem) {
        throw new NotFoundException('Problem không tồn tại');
      }
      title = problem.title;
      statement = problem.statementMd?.trim() || problem.description?.trim() || statement;
    }

    const failedCases = failed.map((r) => {
      const tc = dto.testCases[r.index];
      return {
        index: r.index,
        input: tc?.input ?? '',
        expectedOutput: tc?.expectedOutput ?? r.expectedOutput,
        actualOutput: r.actualOutput,
        stderr: r.stderr,
        verdict: r.verdict,
      };
    });

    const primaryProvider = dto.provider ?? resolveAiDefaultProvider(this.config);
    const primaryModel = dto.model ?? resolveAiDefaultModel(this.config, primaryProvider);
    const plans = buildAiLlmPlans(this.config, {
      provider: primaryProvider,
      model: primaryModel,
    });

    const messages = buildGoldenVerifyFailureDiagnoseMessages({
      title: title || undefined,
      statement: statement || undefined,
      ioSpec: ioSpec || undefined,
      language: dto.language,
      failedCases,
    });

    if (dto.goldenSnippet?.trim()) {
      const snippet = dto.goldenSnippet.trim().slice(0, 800);
      messages[1] = {
        role: 'user',
        content: `${messages[1].content}\n<golden_snippet_optional>\n${snippet}\n</golden_snippet_optional>`,
      };
    }

    let text: string;
    let provider = primaryProvider;
    let model = primaryModel;
    try {
      const run = await this.runLlmPlans(plans, messages, 0.2, 4096, 2);
      text = run.text;
      provider = run.provider;
      model = run.model;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('API_KEY') || msg.includes('not set')) {
        throw new ServiceUnavailableException(msg);
      }
      throw e;
    }

    try {
      const json = JSON.parse(this.extractFirstJsonObject(text) ?? text) as unknown;
      const parsed = goldenVerifyFailureDiagnosisSchema.parse(json);
      const structured = reconcileGoldenVerifyFailureDiagnosis(parsed, failedCases);
      return { provider, model, structured };
    } catch (error) {
      const parseError = error instanceof Error ? error.message : 'Unknown parse error';
      return {
        provider,
        model,
        structured: null,
        parseError,
        rawPreview: text.slice(0, 2000),
      };
    }
  }

  async explainProjectTestFile(dto: ExplainProjectTestFileDto): Promise<ExplainProjectTestFileResult> {
    const primaryProvider = dto.provider ?? resolveAiDefaultProvider(this.config);
    const primaryModel = dto.model ?? resolveAiDefaultModel(this.config, primaryProvider);
    const plans = buildAiLlmPlans(this.config, {
      provider: primaryProvider,
      model: primaryModel,
    });
    const totalLines = Math.max(1, dto.fileContent.split('\n').length);

    const messages = buildExplainProjectTestFileMessages({
      filePath: dto.filePath,
      fileContent: dto.fileContent,
      problemSummary: dto.problemSummary,
      relatedTestsJson: dto.relatedTestsJson,
    });

    const {
      text,
      provider,
      model,
    } = await this.runLlmPlans(plans, messages, 0.2, 4096, 2);

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

    const documents = await Promise.all(
      jobs.map(async (job) => ({
        jobId: job.id,
        uploadedAt: job.createdAt,
        objectKey: job.inputDocObjectKey,
        fileName: job.inputDocFileName,
        contentType: job.inputDocContentType,
        sizeBytes: job.inputDocSizeBytes,
        viewUrl: await this.storage.resolveDisplayUrl(job.inputDocObjectKey, job.inputDocUrl),
      })),
    );

    return {
      problemId,
      documents,
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

    await this.problemStorageAccess.assertAiJobSharedRead(jobId, user);

    if (!job.inputDocObjectKey) {
      throw new NotFoundException('No input document has been attached to this job');
    }

    const ttl = expiresInSeconds ?? 900;
    const downloadUrl = await this.storage.createPresignedDownloadUrl(job.inputDocObjectKey, ttl);

    return {
      jobId: job.id,
      objectKey: job.inputDocObjectKey,
      fileName: job.inputDocFileName,
      contentType: job.inputDocContentType,
      sizeBytes: job.inputDocSizeBytes,
      viewUrl: downloadUrl,
      downloadUrl,
      expiresInSeconds: ttl,
    };
  }

  private assertUserCanManageProblemAi(creatorId: string | null, user: RequestUser): void {
    if (user.role === Role.ADMIN) return;
    if (creatorId === null || creatorId === user.userId) return;
    throw new ForbiddenException(
      'Chỉ chủ đề (creator) hoặc admin mới có thể chạy AI generate-and-save trên problem này',
    );
  }

  private async runLlmPlans(
    plans: AiLlmPlan[],
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    temperature: number,
    maxTokens: number,
    maxAttemptsPerPlan: number,
  ): Promise<{ text: string; provider: 'openai' | 'google'; model: string }> {
    const planFailures: string[] = [];

    for (const plan of plans) {
      try {
        const chunk = await this.generateWithRetry(
          plan.provider,
          plan.model,
          messages,
          temperature,
          maxTokens,
          maxAttemptsPerPlan,
        );
        if (!chunk.trim()) {
          planFailures.push(`${plan.provider}/${plan.model}: empty model response`);
          continue;
        }
        return { text: chunk, provider: plan.provider, model: plan.model };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        planFailures.push(`${plan.provider}/${plan.model}: ${msg}`);
      }
    }

    const detail = planFailures.length ? planFailures.join(' | ') : 'no attempts recorded';
    throw new Error(`All AI providers failed. ${detail}`);
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

  private parseProblemStatementOutput(raw: string): GeneratedProblemStatementOutput {
    const normalized = raw.trim().replace(/^\uFEFF/, '');
    const candidates = this.collectJsonCandidates(normalized);

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const json = JSON.parse(candidate) as unknown;
        return generatedProblemStatementSchema.parse(json);
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Failed to parse AI problem statement JSON. Last error: ${
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

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return /(429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|quota|rate.?limit|timeout|temporar)/i.test(
      error.message,
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildCompactRetryMessages(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const compactInstruction =
      '\nReturn valid compact JSON only (no markdown, no code fence). Omit explanation fields; keep complete input and expectedOutput.';
    return messages.map((message, index) =>
      index === 0
        ? { ...message, content: `${message.content}${compactInstruction}` }
        : message,
    );
  }

  private buildFullIoRetryMessages(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const fullIoInstruction =
      '\nReturn valid JSON only. Every input and expectedOutput must be COMPLETE runnable data (all lines of grids/matrices). Forbidden: "...", "…", or labels like "100x100 grid". Use smaller dimensions if needed, but print every cell value.';
    return messages.map((message, index) =>
      index === 0
        ? { ...message, content: `${message.content}${fullIoInstruction}` }
        : message,
    );
  }

  private async retryDraftForFullIo(params: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    usedProvider: 'openai' | 'google';
    usedModel: string;
    maxCases: number;
    outputCap: number;
    maxTokens: number;
  }): Promise<{
    text: string;
    parsed: GeneratedTestcaseOutput | null;
    parseError?: string;
    truncationSuspected: boolean;
    maxTokensUsed: number;
  } | null> {
    const fullMessages = this.buildFullIoRetryMessages(params.messages);
    const retryBudget = Math.min(params.outputCap, Math.max(params.maxTokens * 2, 14000));
    try {
      const retryText = await this.generateWithRetry(
        params.usedProvider,
        params.usedModel,
        fullMessages,
        0,
        retryBudget,
        1,
      );
      return this.parseTestcaseOutputWithRetries({
        text: retryText,
        usedProvider: params.usedProvider,
        usedModel: params.usedModel,
        messages: fullMessages,
        maxCases: params.maxCases,
        outputCap: params.outputCap,
        initialMaxTokens: retryBudget,
        requireFullIo: true,
      });
    } catch {
      return null;
    }
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

  private resolveFastModeEnabled(statementLength: number, maxTestCases: number): boolean {
    const raw = (this.config.get<string>(EnvKeys.AI_FAST_MODE) ?? '').toLowerCase().trim();
    if (['1', 'true', 'yes', 'on'].includes(raw)) {
      return true;
    }
    if (raw === 'auto') {
      return (
        statementLength < FAST_MODE_AUTO_MAX_STATEMENT && maxTestCases <= FAST_MODE_AUTO_MAX_CASES
      );
    }
    return false;
  }
}
