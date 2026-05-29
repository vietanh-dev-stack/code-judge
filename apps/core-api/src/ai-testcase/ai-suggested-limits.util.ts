import type { GenerateAiTestcaseDto } from './dto/generate-ai-testcase.dto';
import type { GeneratedTestcaseOutput } from './ai-testcase.prompt';

const MEMORY_TIERS_MB = [32, 64, 128, 256, 512, 1024, 2048] as const;

function roundMemoryMb(raw: number): number {
  const minMb = Math.max(16, Math.ceil(raw));
  for (const tier of MEMORY_TIERS_MB) {
    if (minMb <= tier) return tier;
  }
  return Math.ceil(minMb / 512) * 512;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Parse upper bound on n (or similar) from constraints text. */
export function parseMaxConstraintN(text: string): number {
  const blob = text;
  let maxN = 0;

  const powMatches = blob.matchAll(/10\s*\^\s*(\d+)/gi);
  for (const m of powMatches) {
    const exp = Number(m[1]);
    if (Number.isFinite(exp) && exp >= 0 && exp <= 9) {
      maxN = Math.max(maxN, 10 ** exp);
    }
  }

  const nUpper = blob.matchAll(
    /n\s*(?:≤|<=|<\s*=)\s*(\d+(?:\s*\*\s*\d+)?)/gi,
  );
  for (const m of nUpper) {
    const raw = m[1].replace(/\s/g, '');
    const val = raw.includes('*') ? evalSimpleProduct(raw) : Number(raw);
    if (Number.isFinite(val) && val > 0) maxN = Math.max(maxN, val);
  }

  const rangeMatch = blob.match(/(\d+)\s*(?:≤|<=)\s*n\s*(?:≤|<=)\s*(\d+)/i);
  if (rangeMatch) {
    const hi = Number(rangeMatch[2]);
    if (Number.isFinite(hi) && hi > 0) maxN = Math.max(maxN, hi);
  }

  return maxN;
}

function evalSimpleProduct(expr: string): number {
  const parts = expr.split('*').map((p) => Number(p.trim()));
  if (parts.some((p) => !Number.isFinite(p))) return NaN;
  return parts.reduce((a, b) => a * b, 1);
}

function normalizeDifficulty(
  raw?: string,
): 'EASY' | 'MEDIUM' | 'HARD' {
  const d = (raw ?? '').trim().toUpperCase();
  if (d === 'MEDIUM' || d === 'MED') return 'MEDIUM';
  if (d === 'HARD') return 'HARD';
  return 'EASY';
}

function heuristicFromConstraints(
  difficulty: 'EASY' | 'MEDIUM' | 'HARD',
  maxN: number,
  maxInputChars: number,
): { timeLimitMs: number; memoryLimitMb: number } {
  let timeMs = difficulty === 'EASY' ? 1000 : difficulty === 'MEDIUM' ? 2000 : 3000;
  let memMb = difficulty === 'EASY' ? 128 : difficulty === 'MEDIUM' ? 256 : 512;

  if (maxN > 0) {
    if (maxN <= 1000) {
      timeMs = Math.max(timeMs, 500);
    } else if (maxN <= 10_000) {
      timeMs = Math.max(timeMs, 1000);
      memMb = Math.max(memMb, 128);
    } else if (maxN <= 100_000) {
      timeMs = Math.max(timeMs, 2000);
      memMb = Math.max(memMb, 256);
    } else if (maxN <= 1_000_000) {
      timeMs = Math.max(timeMs, 3000);
      memMb = Math.max(memMb, 512);
    } else {
      timeMs = Math.max(timeMs, 5000);
      memMb = Math.max(memMb, 512);
    }
  }

  if (maxInputChars > 50_000) {
    memMb = Math.max(memMb, 512);
  }
  if (maxInputChars > 200_000) {
    memMb = Math.max(memMb, 1024);
  }

  const timeCap = difficulty === 'HARD' ? 30_000 : difficulty === 'MEDIUM' ? 20_000 : 10_000;
  return {
    timeLimitMs: clamp(timeMs, 500, timeCap),
    memoryLimitMb: roundMemoryMb(memMb),
  };
}

export type ResolveSuggestedLimitsInput = {
  difficulty?: string;
  statement?: string;
  ioSpec?: string;
  testCases?: Array<{ input: string }>;
  aiSuggestedTimeMs?: number;
  aiSuggestedMemoryMb?: number;
};

export function resolveSuggestedLimits(
  input: ResolveSuggestedLimitsInput,
): { suggestedTimeLimitMs: number; suggestedMemoryLimitMb: number } {
  const difficulty = normalizeDifficulty(input.difficulty);
  const blob = `${input.statement ?? ''}\n${input.ioSpec ?? ''}`;
  const maxN = parseMaxConstraintN(blob);
  const maxInputChars = (input.testCases ?? []).reduce(
    (m, tc) => Math.max(m, (tc.input ?? '').length),
    0,
  );
  const heuristic = heuristicFromConstraints(difficulty, maxN, maxInputChars);

  let timeMs = heuristic.timeLimitMs;
  let memMb = heuristic.memoryLimitMb;

  if (
    typeof input.aiSuggestedTimeMs === 'number' &&
    input.aiSuggestedTimeMs >= 100 &&
    input.aiSuggestedTimeMs <= 300_000
  ) {
    timeMs = clamp(Math.round(input.aiSuggestedTimeMs), 500, 30_000);
  }
  if (
    typeof input.aiSuggestedMemoryMb === 'number' &&
    input.aiSuggestedMemoryMb >= 8 &&
    input.aiSuggestedMemoryMb <= 8192
  ) {
    memMb = roundMemoryMb(input.aiSuggestedMemoryMb);
  }

  return { suggestedTimeLimitMs: timeMs, suggestedMemoryLimitMb: memMb };
}

export function enrichTestcaseDraftWithSuggestedLimits(
  dto: GenerateAiTestcaseDto,
  parsed: GeneratedTestcaseOutput | null,
): GeneratedTestcaseOutput | null {
  if (!parsed) return null;
  const limits = resolveSuggestedLimits({
    difficulty: dto.difficulty,
    statement: dto.statement,
    ioSpec: dto.ioSpec,
    testCases: parsed.testCases,
    aiSuggestedTimeMs: parsed.suggestedTimeLimitMs,
    aiSuggestedMemoryMb: parsed.suggestedMemoryLimitMb,
  });
  return {
    ...parsed,
    suggestedTimeLimitMs: limits.suggestedTimeLimitMs,
    suggestedMemoryLimitMb: limits.suggestedMemoryLimitMb,
  };
}

export function enrichProblemStatementWithSuggestedLimits(
  parsed: {
    suggestedDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    suggestedTimeLimitMs?: number;
    suggestedMemoryLimitMb?: number;
    statementMd?: string;
    ioSpec?: string;
  },
): { suggestedTimeLimitMs: number; suggestedMemoryLimitMb: number } {
  return resolveSuggestedLimits({
    difficulty: parsed.suggestedDifficulty,
    statement: parsed.statementMd,
    ioSpec: parsed.ioSpec,
    aiSuggestedTimeMs: parsed.suggestedTimeLimitMs,
    aiSuggestedMemoryMb: parsed.suggestedMemoryLimitMb,
  });
}
