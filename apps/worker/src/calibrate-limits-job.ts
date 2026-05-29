import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import {
  isJudge0MemoryEnforced,
  suggestLimitsFromMeasurements,
} from './lib/effective-limits';
import { getJudge0LanguageId, runJudge0Submission } from './lib/judge0-client';

export type CalibrateLimitsJobData = {
  problemId: string;
  /** Timeout mỗi case khi đo (ms) — không phải limit chính thức */
  measureTimeLimitMs?: number;
};

export type CalibrateLimitsCaseResult = {
  testCaseId: string;
  orderIndex: number;
  runtimeMs: number;
  memoryMb: number;
  verdict: string;
};

export type CalibrateLimitsJobResult = {
  problemId: string;
  goldenLanguage: string;
  memoryEnforced: boolean;
  cases: CalibrateLimitsCaseResult[];
  suggestedTimeLimitMs: number;
  suggestedMemoryLimitMb: number;
  currentTimeLimitMs: number;
  currentMemoryLimitMb: number;
};

const DEFAULT_MEASURE_MS = 60_000;

export async function processCalibrateLimitsJob(
  job: Job<CalibrateLimitsJobData>,
  deps: { prisma: PrismaClient; judge0Url: string },
): Promise<CalibrateLimitsJobResult> {
  const { problemId, measureTimeLimitMs } = job.data;
  const measureMs = measureTimeLimitMs ?? DEFAULT_MEASURE_MS;
  const measureSec = measureMs / 1000;
  const wallSec = Math.max(measureSec + 5, 10);

  const problem = await deps.prisma.problem.findUnique({
    where: { id: problemId },
    select: {
      id: true,
      difficulty: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      testCases: {
        select: { id: true, orderIndex: true, input: true, expectedOutput: true },
        orderBy: { orderIndex: 'asc' },
      },
      goldenSolutions: {
        where: { isPrimary: true },
        take: 1,
        select: { sourceCode: true, sourceCodeObjectKey: true, language: true },
      },
    },
  });

  if (!problem) {
    throw new Error(`Problem not found: ${problemId}`);
  }
  if (!problem.testCases.length) {
    throw new Error('Problem has no test cases');
  }

  const golden =
    problem.goldenSolutions[0] ??
    (await deps.prisma.goldenSolution.findFirst({
      where: { problemId },
      orderBy: { createdAt: 'asc' },
      select: { sourceCode: true, sourceCodeObjectKey: true, language: true },
    }));

  if (!golden) {
    throw new Error('Problem has no golden solution');
  }

  let sourceCode = golden.sourceCode?.trim() ?? '';
  if (!sourceCode && golden.sourceCodeObjectKey) {
    const { getObjectString } = await import('./lib/storage');
    sourceCode = (await getObjectString(golden.sourceCodeObjectKey)).trim();
  }
  if (!sourceCode) {
    throw new Error('Golden solution has no source code');
  }

  const languageId = getJudge0LanguageId(golden.language);
  const memoryKb = Math.max(problem.memoryLimitMb * 1024, 256_000);
  const cases: CalibrateLimitsCaseResult[] = [];
  const runtimes: number[] = [];
  const memories: number[] = [];

  for (let i = 0; i < problem.testCases.length; i++) {
    const tc = problem.testCases[i];
    job.updateProgress({
      pct: Math.round((i / problem.testCases.length) * 90),
      log: `Measuring case ${i + 1}/${problem.testCases.length}`,
    });

    const run = await runJudge0Submission({
      judge0Url: deps.judge0Url,
      sourceCode,
      languageId,
      stdin: tc.input,
      expectedOutput: tc.expectedOutput,
      cpuTimeLimitSec: measureSec,
      wallTimeLimitSec: wallSec,
      memoryLimitKb: memoryKb,
      pollRetries: 60,
    });

    runtimes.push(run.runtimeMs);
    memories.push(run.memoryMb);
    cases.push({
      testCaseId: tc.id,
      orderIndex: tc.orderIndex,
      runtimeMs: run.runtimeMs,
      memoryMb: run.memoryMb,
      verdict: run.verdict,
    });
  }

  const { suggestedTimeLimitMs, suggestedMemoryLimitMb } = suggestLimitsFromMeasurements(
    runtimes,
    memories,
    problem.difficulty,
  );

  job.updateProgress({ pct: 100, log: 'Calibration complete' });

  return {
    problemId,
    goldenLanguage: golden.language,
    memoryEnforced: isJudge0MemoryEnforced(),
    cases,
    suggestedTimeLimitMs,
    suggestedMemoryLimitMb,
    currentTimeLimitMs: problem.timeLimitMs,
    currentMemoryLimitMb: problem.memoryLimitMb,
  };
}
