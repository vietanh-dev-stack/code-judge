import type { AnalyzeGoldenVerifyFailuresResult } from '@/services/ai-testcase.apis';

const STORAGE_PREFIX = 'cj:golden-verify-diagnosis:v1:';

export type SavedGoldenVerifyDiagnosis = {
  savedAt: string;
  verifySummary: { total: number; passed: number; failed: number };
  language: string;
  diagnosis: AnalyzeGoldenVerifyFailuresResult;
};

export function goldenVerifyDiagnosisStorageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

export function loadSavedGoldenVerifyDiagnosis(
  scope: string,
): SavedGoldenVerifyDiagnosis | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(goldenVerifyDiagnosisStorageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGoldenVerifyDiagnosis;
    if (!parsed?.diagnosis || !parsed.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSavedGoldenVerifyDiagnosis(
  scope: string,
  payload: SavedGoldenVerifyDiagnosis,
): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(goldenVerifyDiagnosisStorageKey(scope), JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearSavedGoldenVerifyDiagnosis(scope: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(goldenVerifyDiagnosisStorageKey(scope));
  } catch {
    // ignore
  }
}
