import type { GenerateTestCasesDraftResult } from '@/services/problem.apis';

const STORAGE_PREFIX = 'cj:ai-testcase-draft:v1:';

export type AiDraftPreviewCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
};

export type SavedAiTestcaseDraft = {
  savedAt: string;
  problemTitle?: string;
  draftResult: GenerateTestCasesDraftResult;
  previewCases: AiDraftPreviewCase[];
};

export function aiTestcaseDraftStorageScope(problemId?: string | null): string {
  return problemId?.trim() ? `problem:${problemId.trim()}` : 'create:new';
}

export function aiTestcaseDraftStorageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

function compactDraftResult(draft: GenerateTestCasesDraftResult): GenerateTestCasesDraftResult {
  if (!draft.raw || draft.raw.length <= 8000) {
    return draft;
  }
  return {
    ...draft,
    raw: `${draft.raw.slice(0, 8000)}\n…[truncated for session storage]`,
  };
}

export function saveSavedAiTestcaseDraft(scope: string, payload: SavedAiTestcaseDraft): void {
  if (typeof window === 'undefined') return;
  try {
    const toStore: SavedAiTestcaseDraft = {
      ...payload,
      draftResult: compactDraftResult(payload.draftResult),
    };
    sessionStorage.setItem(aiTestcaseDraftStorageKey(scope), JSON.stringify(toStore));
  } catch {
    // quota / private mode — ignore
  }
}

export function loadSavedAiTestcaseDraft(scope: string): SavedAiTestcaseDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(aiTestcaseDraftStorageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedAiTestcaseDraft;
    if (!parsed?.draftResult || !parsed.savedAt || !Array.isArray(parsed.previewCases)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedAiTestcaseDraft(scope: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(aiTestcaseDraftStorageKey(scope));
  } catch {
    // ignore
  }
}

export function getSavedAiTestcaseDraftMeta(
  scope: string,
): { savedAt: string; caseCount: number; problemTitle?: string } | null {
  const saved = loadSavedAiTestcaseDraft(scope);
  if (!saved) return null;
  const parsedCount = saved.draftResult.parsed?.testCases?.length ?? 0;
  const caseCount = Math.max(saved.previewCases.length, parsedCount);
  const hasContent =
    caseCount > 0 || Boolean(saved.draftResult.raw) || Boolean(saved.draftResult.parseError);
  if (!hasContent) return null;
  return {
    savedAt: saved.savedAt,
    caseCount,
    problemTitle: saved.problemTitle,
  };
}
