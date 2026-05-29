import { getOptionalEnv } from './env';

export type EffectiveLimitsInput = {
  problemTimeLimitMs: number;
  problemMemoryLimitMb: number;
  contestTimeLimitMsOverride?: number | null;
  contestMemoryLimitMbOverride?: number | null;
  testCaseTimeLimitMsOverride?: number | null;
  testCaseMemoryLimitMbOverride?: number | null;
  language: string;
};

export type EffectiveLimits = {
  timeLimitMs: number;
  memoryLimitMb: number;
  cpuTimeLimitSec: number;
  wallTimeLimitSec: number;
  memoryLimitKb: number;
  languageTimeMultiplier: number;
};

const DEFAULT_MULTIPLIERS: Record<string, number> = {
  PYTHON: 2,
  JAVASCRIPT: 2,
  JS: 2,
  JAVA: 2,
  CPP: 1,
  'C++': 1,
  C: 1,
  GO: 1,
  GOLANG: 1,
  RUST: 1,
  RS: 1,
};

function parseLanguageMultipliers(): Record<string, number> {
  const raw = getOptionalEnv(process.env.LIMIT_LANGUAGE_MULTIPLIERS, '').trim();
  if (!raw) {
    return DEFAULT_MULTIPLIERS;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (parsed && typeof parsed === 'object') {
      const out: Record<string, number> = { ...DEFAULT_MULTIPLIERS };
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number' && value > 0 && Number.isFinite(value)) {
          out[key.trim().toUpperCase()] = value;
        }
      }
      return out;
    }
  } catch {
    /* use defaults */
  }
  return DEFAULT_MULTIPLIERS;
}

let cachedMultipliers: Record<string, number> | null = null;

export function getLanguageTimeMultiplier(language: string): number {
  if (!cachedMultipliers) {
    cachedMultipliers = parseLanguageMultipliers();
  }
  const key = language?.trim().toUpperCase() || 'PYTHON';
  return cachedMultipliers[key] ?? 1;
}

export function resolveEffectiveLimits(input: EffectiveLimitsInput): EffectiveLimits {
  const baseTimeMs =
    input.testCaseTimeLimitMsOverride ??
    input.contestTimeLimitMsOverride ??
    input.problemTimeLimitMs;
  const baseMemMb =
    input.testCaseMemoryLimitMbOverride ??
    input.contestMemoryLimitMbOverride ??
    input.problemMemoryLimitMb;

  const mult = getLanguageTimeMultiplier(input.language);
  const timeLimitMs = Math.max(1, Math.ceil(baseTimeMs * mult));
  const memoryLimitMb = Math.max(1, baseMemMb);
  const cpuTimeLimitSec = timeLimitMs / 1000;
  const wallTimeLimitSec = Math.max(cpuTimeLimitSec + 2, 5);

  return {
    timeLimitMs,
    memoryLimitMb,
    cpuTimeLimitSec,
    wallTimeLimitSec,
    memoryLimitKb: memoryLimitMb * 1024,
    languageTimeMultiplier: mult,
  };
}

export function parseLimitSafetyFloat(envValue: string | undefined, fallback: number): number {
  const n = Number(envValue);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

export function roundMemoryLimitMb(rawMb: number): number {
  const tiers = [32, 64, 128, 256, 512, 1024, 2048];
  const minMb = Math.max(16, Math.ceil(rawMb));
  for (const tier of tiers) {
    if (minMb <= tier) {
      return tier;
    }
  }
  return Math.ceil(minMb / 512) * 512;
}

export function suggestLimitsFromMeasurements(
  runtimesMs: number[],
  memoriesMb: number[],
  difficulty?: string,
): { suggestedTimeLimitMs: number; suggestedMemoryLimitMb: number } {
  const timeSafety = parseLimitSafetyFloat(process.env.LIMIT_TIME_SAFETY, 2);
  const memSafety = parseLimitSafetyFloat(process.env.LIMIT_MEM_SAFETY, 1.5);

  const maxRuntime = runtimesMs.length ? Math.max(...runtimesMs) : 0;
  const maxMemory = memoriesMb.length ? Math.max(...memoriesMb) : 0;

  let minTime = 500;
  let maxTime = 30_000;
  if (difficulty === 'EASY') {
    minTime = 500;
    maxTime = 10_000;
  } else if (difficulty === 'MEDIUM') {
    minTime = 1000;
    maxTime = 20_000;
  } else if (difficulty === 'HARD') {
    minTime = 2000;
    maxTime = 30_000;
  }

  const suggestedTimeLimitMs = Math.min(
    maxTime,
    Math.max(minTime, Math.ceil(maxRuntime * timeSafety)),
  );
  const suggestedMemoryLimitMb = roundMemoryLimitMb(Math.max(32, maxMemory * memSafety));

  return { suggestedTimeLimitMs, suggestedMemoryLimitMb };
}

export function isJudge0MemoryEnforced(): boolean {
  return getOptionalEnv(process.env.JUDGE0_MEMORY_ENFORCED, 'false').toLowerCase() === 'true';
}
