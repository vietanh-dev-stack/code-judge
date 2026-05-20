/** Ngôn ngữ golden verify — đồng bộ với worker `golden-verify-job`. */
export const GOLDEN_VERIFY_LANGUAGES = [
  'python',
  'javascript',
  'java',
  'cpp',
  'c',
  'go',
  'rust',
] as const;

export type GoldenVerifyLanguage = (typeof GOLDEN_VERIFY_LANGUAGES)[number];

const ALLOWED = new Set<string>(GOLDEN_VERIFY_LANGUAGES);

/**
 * Chuẩn hoá về slug gửi worker/Lambda (chữ thường).
 * Chấp nhận alias: JS, C++, PYTHON, …
 */
export function normalizeGoldenVerifyLanguage(input: string | undefined): GoldenVerifyLanguage {
  const raw = (input ?? 'python').trim();
  if (!raw) return 'python';

  const compact = raw.toUpperCase().replace(/\s+/g, '');
  const alias: Record<string, GoldenVerifyLanguage> = {
    PYTHON: 'python',
    JS: 'javascript',
    JAVASCRIPT: 'javascript',
    JAVA: 'java',
    CPP: 'cpp',
    'C++': 'cpp',
    C: 'c',
    GO: 'go',
    RUST: 'rust',
  };

  if (alias[compact]) return alias[compact];

  const lower = raw.toLowerCase();
  if (ALLOWED.has(lower)) return lower as GoldenVerifyLanguage;

  throw new Error(`Unsupported golden verify language: ${raw}`);
}

export function isGoldenVerifyLanguage(value: string): value is GoldenVerifyLanguage {
  return ALLOWED.has(value.trim().toLowerCase());
}
