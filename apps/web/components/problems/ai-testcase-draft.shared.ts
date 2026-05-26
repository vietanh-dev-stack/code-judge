import type {
  GenerateTestCasesDraftDto,
  GenerateTestCasesDraftResult,
} from '@/services/problem.apis';

export const DIFFICULTY_AI_LABEL: Record<'EASY' | 'MEDIUM' | 'HARD', string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export function extractSuggestedLimitsFromAiDraft(
  parsed: GenerateTestCasesDraftResult['parsed'],
): { timeLimitMs: number; memoryLimitMb: number } | null {
  if (!parsed?.suggestedTimeLimitMs) return null;
  return {
    timeLimitMs: parsed.suggestedTimeLimitMs,
    memoryLimitMb: parsed.suggestedMemoryLimitMb ?? 256,
  };
}

/** Test case trong sheet nháp AI (có thể đã chỉnh tay / golden verify). */
export type AiDraftSheetCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
};

/** Ưu tiên bản đã chỉnh trong sheet / session; fallback parse gốc từ AI. */
export function resolveAiDraftPreviewCases(
  editedCases: AiDraftSheetCase[] | null,
  draftResult: GenerateTestCasesDraftResult | null,
): AiDraftSheetCase[] {
  if (editedCases != null) return editedCases;
  return draftResult ? mapAiDraftToFormTestCases(draftResult.parsed) : [];
}

export function normalizeAiDraftSheetCases(
  cases: AiDraftSheetCase[],
): Array<{ input: string; expectedOutput: string; isHidden: boolean; weight: number }> {
  return cases
    .map((tc) => ({
      input: (tc.input ?? '').trim(),
      expectedOutput: (tc.expectedOutput ?? '').trim(),
      isHidden: Boolean(tc.isHidden),
      weight: typeof tc.weight === 'number' && tc.weight > 0 ? tc.weight : 1,
    }))
    .filter((tc) => tc.input.length > 0 || tc.expectedOutput.length > 0);
}

export function mapAiDraftToFormTestCases(
  parsed: GenerateTestCasesDraftResult['parsed'],
): Array<{ input: string; expectedOutput: string; isHidden: boolean; weight: number }> {
  if (!parsed?.testCases?.length) return [];
  return normalizeAiDraftSheetCases(
    parsed.testCases.map((tc) => ({
      input: tc.input ?? '',
      expectedOutput: tc.expectedOutput ?? '',
      isHidden: Boolean(tc.isHidden),
      weight: typeof tc.weight === 'number' && tc.weight > 0 ? tc.weight : 1,
    })),
  );
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
  preferFullIoOutput: boolean;
  revisionSummary: string;
  revisionFeedback: string;
  revisionValidatorLines: string;
};

/** Đồng bộ regex với core-api problemNeedsFullIo */
export function problemNeedsFullIoForAi(statement: string, ioSpec?: string): boolean {
  const blob = `${statement}\n${ioSpec ?? ''}`;
  return /(\d+\s*[x×]\s*\d+|\bgrid\b|lưới|ma\s*trận|\bmatrix\b|\bboard\b|bảng\s*\d|maze|đồ\s*thị\s*lưới)/i.test(
    blob,
  );
}

export function isLikelyPlaceholderIoClient(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (/^(\.{2,}|…+)$/u.test(t)) return true;
  if (/\.\.\./u.test(t) && !t.includes('\n') && t.length < 120) return true;
  return false;
}

export const defaultAiGenOptions: AiGenOptionsState = {
  ioSpec: '',
  supplementaryText: '',
  provider: '',
  model: '',
  maxSuggestions: 10,
  preferFullIoOutput: true,
  revisionSummary: '',
  revisionFeedback: '',
  revisionValidatorLines: '',
};

/** Đồng bộ với core-api LONG_STATEMENT_THRESHOLD */
export const LONG_STATEMENT_WARN_CHARS = 4000;

export function statementLengthForAi(form: {
  description?: string;
  statementMd?: string;
}): number {
  return buildStatementPayloadForAi(form).length;
}

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
  const stmtLen = statementLengthForAi({
    description: input.description,
    statementMd: input.statementMd,
  });
  const longStatement = stmtLen > LONG_STATEMENT_WARN_CHARS;
  let maxSuggestions = Math.min(input.aiGenOptions.maxSuggestions || 10, 25);
  if (longStatement) {
    maxSuggestions = Math.min(maxSuggestions, 8);
  }
  const maxForAi = Math.min(Math.max(maxSuggestions, 1), maxCap);
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
    ...(input.aiGenOptions.preferFullIoOutput ||
    problemNeedsFullIoForAi(
      buildStatementPayloadForAi({
        description: input.description,
        statementMd: input.statementMd,
      }),
      input.aiGenOptions.ioSpec.trim() || undefined,
    )
      ? { preferFullIoOutput: true }
      : {}),
    ...(revision ? { revision } : {}),
  };
}
