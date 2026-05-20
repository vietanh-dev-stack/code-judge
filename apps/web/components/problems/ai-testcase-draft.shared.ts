import type {
  GenerateTestCasesDraftDto,
  GenerateTestCasesDraftResult,
} from '@/services/problem.apis';

export const DIFFICULTY_AI_LABEL: Record<'EASY' | 'MEDIUM' | 'HARD', string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export function mapAiDraftToFormTestCases(
  parsed: GenerateTestCasesDraftResult['parsed'],
): Array<{ input: string; expectedOutput: string; isHidden: boolean; weight: number }> {
  if (!parsed?.testCases?.length) return [];
  return parsed.testCases
    .map((tc) => ({
      input: (tc.input ?? '').trim(),
      expectedOutput: (tc.expectedOutput ?? '').trim(),
      isHidden: Boolean(tc.isHidden),
      weight: typeof tc.weight === 'number' && tc.weight > 0 ? tc.weight : 1,
    }))
    .filter((tc) => tc.input.length > 0 || tc.expectedOutput.length > 0);
}

export function buildStatementPayloadForAi(form: {
  description?: string;
  statementMd?: string;
}): string {
  const desc = form.description?.trim();
  const stmt = form.statementMd?.trim() ?? '';
  if (desc) {
    return `## Mô tả ngắn\n${desc}\n\n---\n\n${stmt}`;
  }
  return stmt;
}

export function mapLanguagesForAi(langs: string[] | undefined): string[] | undefined {
  if (!langs?.length) return undefined;
  return langs.map((l) => l.trim().toLowerCase()).filter(Boolean);
}

export type AiGenOptionsState = {
  ioSpec: string;
  supplementaryText: string;
  provider: '' | 'openai' | 'google';
  model: string;
  maxSuggestions: number;
  revisionSummary: string;
  revisionFeedback: string;
  revisionValidatorLines: string;
};

export const defaultAiGenOptions: AiGenOptionsState = {
  ioSpec: '',
  supplementaryText: '',
  provider: '',
  model: '',
  maxSuggestions: 10,
  revisionSummary: '',
  revisionFeedback: '',
  revisionValidatorLines: '',
};

export function buildGenerateTestCasesDraftDto(input: {
  title: string;
  description?: string;
  statementMd: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMs?: number;
  memoryLimitMb?: number;
  supportedLanguages?: string[] | null;
  maxTestCasesForProblem: number;
  aiGenOptions: AiGenOptionsState;
  previousDraft: GenerateTestCasesDraftResult | null;
}): GenerateTestCasesDraftDto {
  const maxCap = Math.min(input.maxTestCasesForProblem ?? 100, 25);
  const maxForAi = Math.min(
    Math.max(Math.min(input.aiGenOptions.maxSuggestions || 10, 25), 1),
    maxCap,
  );
  const difficultyKey = input.difficulty as keyof typeof DIFFICULTY_AI_LABEL;
  const validatorIssues = input.aiGenOptions.revisionValidatorLines
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasRevision =
    Boolean(input.aiGenOptions.revisionSummary.trim()) ||
    Boolean(input.aiGenOptions.revisionFeedback.trim()) ||
    validatorIssues.length > 0;
  const revision = hasRevision
    ? {
        promptVersionUsed: input.previousDraft?.promptVersion,
        previousOutputSummary: input.aiGenOptions.revisionSummary.trim() || undefined,
        userFeedback: input.aiGenOptions.revisionFeedback.trim() || undefined,
        validatorIssues: validatorIssues.length ? validatorIssues : undefined,
      }
    : undefined;

  return {
    title: input.title.trim(),
    statement: buildStatementPayloadForAi({
      description: input.description,
      statementMd: input.statementMd,
    }),
    difficulty: DIFFICULTY_AI_LABEL[difficultyKey],
    timeLimitMs: input.timeLimitMs,
    memoryLimitMb: input.memoryLimitMb,
    supportedLanguages: mapLanguagesForAi(input.supportedLanguages ?? undefined),
    maxTestCases: maxForAi,
    ...(input.aiGenOptions.ioSpec.trim() ? { ioSpec: input.aiGenOptions.ioSpec.trim() } : {}),
    ...(input.aiGenOptions.supplementaryText.trim()
      ? { supplementaryText: input.aiGenOptions.supplementaryText.trim() }
      : {}),
    ...(input.aiGenOptions.provider ? { provider: input.aiGenOptions.provider } : {}),
    ...(input.aiGenOptions.model.trim() ? { model: input.aiGenOptions.model.trim() } : {}),
    ...(revision ? { revision } : {}),
  };
}
