import type { Job } from 'bullmq';
import { InvokeCommand, type LambdaClient } from '@aws-sdk/client-lambda';
import { getOptionalEnv } from './lib/env';
import { normalizeJudgeOutput, runGoldenPythonInline } from './lib/golden-python-runner';
import { createWorkerLogger } from './lib/logger';

const log = createWorkerLogger('golden-verify');

export type GoldenVerifyJobData = {
  goldenSourceCode: string;
  language: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  timeLimitMs: number;
};

export type GoldenVerifyVerdict =
  | 'OK'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT'
  | 'PYTHON_NOT_FOUND';

export type GoldenVerifyWorkerResult = {
  summary: { total: number; passed: number; failed: number };
  results: Array<{
    index: number;
    passed: boolean;
    expectedOutput: string;
    actualOutput?: string;
    stderr?: string;
    verdict: GoldenVerifyVerdict;
  }>;
};

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function unwrapLambdaResult(payload: unknown): unknown {
  if (payload === null || payload === undefined) {
    return payload;
  }
  if (typeof payload === 'string') {
    return unwrapLambdaResult(tryParseJson(payload));
  }
  if (typeof payload !== 'object') {
    return payload;
  }
  const result = payload as Record<string, unknown>;
  if (typeof result.body === 'string') {
    return unwrapLambdaResult(tryParseJson(result.body));
  }
  if (result.payload !== undefined) {
    return unwrapLambdaResult(result.payload);
  }
  if (result.result !== undefined) {
    return unwrapLambdaResult(result.result);
  }
  if (Array.isArray(result.results)) {
    return result;
  }
  return result;
}

function normalizeGoldenVerifyLanguage(language: string | undefined): string {
  const raw = (language ?? 'python').trim();
  if (!raw) return 'python';
  const compact = raw.toUpperCase().replace(/\s+/g, '');
  const alias: Record<string, string> = {
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
  const allowed = new Set(['python', 'javascript', 'java', 'cpp', 'c', 'go', 'rust']);
  if (allowed.has(lower)) return lower;
  throw new Error(`golden-verify: ngôn ngữ không hỗ trợ: ${raw}`);
}

function normalizeLanguageForLambdaPayload(language: string): string {
  return normalizeGoldenVerifyLanguage(language);
}

async function runWithLambda(
  lambdaClient: LambdaClient,
  functionName: string,
  code: string,
  language: string,
  testCases: GoldenVerifyJobData['testCases'],
  timeLimitMs: number,
): Promise<GoldenVerifyWorkerResult> {
  const tcForLambda = testCases.map((tc, i) => ({
    id: `golden-verify-${i}`,
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    isHidden: false,
    weight: 1,
    orderIndex: i,
  }));

  const payloadObj = {
    submissionId: `golden-verify`,
    userId: 'golden-verify',
    problemId: 'golden-verify',
    contestId: null,
    language: normalizeLanguageForLambdaPayload(language),
    code,
    sourceCodeObjectKey: null,
    timeLimit: timeLimitMs,
    memoryLimitMb: 512,
    bucket: getOptionalEnv(process.env.MINIO_BUCKET, 'codejudge'),
    testCases: tcForLambda,
    enableParallelExecution: true,
  };

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify(payloadObj)),
  });

  const response = await lambdaClient.send(command);
  const responsePayload = response.Payload ? Buffer.from(response.Payload).toString('utf8') : null;

  let lambdaResult: any = null;
  if (responsePayload) {
    lambdaResult = unwrapLambdaResult(responsePayload);
  }

  const results: GoldenVerifyWorkerResult['results'] = [];
  let passed = 0;

  if (response.FunctionError || response.StatusCode !== 200 || !lambdaResult) {
    const msg = `Lambda lỗi: functionError=${response.FunctionError} status=${response.StatusCode}`;
    log.warn(msg);
    for (let i = 0; i < testCases.length; i++) {
      results.push({
        index: i,
        passed: false,
        expectedOutput: testCases[i]!.expectedOutput,
        stderr: msg,
        verdict: 'RUNTIME_ERROR',
      });
    }
    return { summary: { total: testCases.length, passed: 0, failed: testCases.length }, results };
  }

  if (lambdaResult.compileError) {
    const msg = String(lambdaResult.compileError);
    for (let i = 0; i < testCases.length; i++) {
      results.push({
        index: i,
        passed: false,
        expectedOutput: testCases[i]!.expectedOutput,
        stderr: msg,
        verdict: 'RUNTIME_ERROR',
      });
    }
    return { summary: { total: testCases.length, passed: 0, failed: testCases.length }, results };
  }

  if (!Array.isArray(lambdaResult.results)) {
    const msg = 'Lambda trả kết quả không hợp lệ (thiếu results[])';
    for (let i = 0; i < testCases.length; i++) {
      results.push({
        index: i,
        passed: false,
        expectedOutput: testCases[i]!.expectedOutput,
        stderr: msg,
        verdict: 'RUNTIME_ERROR',
      });
    }
    return { summary: { total: testCases.length, passed: 0, failed: testCases.length }, results };
  }

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]!;
    const expectedNorm = normalizeJudgeOutput(tc.expectedOutput);
    const resultItem = lambdaResult.results[i] ?? {};
    const output = String(resultItem.output ?? '').trim();
    const status = String(resultItem.status ?? '');

    if (status === 'TIME_LIMIT_EXCEEDED') {
      results.push({
        index: i,
        passed: false,
        expectedOutput: tc.expectedOutput,
        actualOutput: normalizeJudgeOutput(output),
        stderr: resultItem.stderr ? String(resultItem.stderr) : undefined,
        verdict: 'TIME_LIMIT',
      });
      continue;
    }

    if (status !== 'ACCEPTED') {
      results.push({
        index: i,
        passed: false,
        expectedOutput: tc.expectedOutput,
        actualOutput: normalizeJudgeOutput(output),
        stderr: String(resultItem.output ?? resultItem.stderr ?? ''),
        verdict: 'RUNTIME_ERROR',
      });
      continue;
    }

    const actualNorm = normalizeJudgeOutput(output);
    const ok = actualNorm === expectedNorm;
    if (ok) passed++;
    results.push({
      index: i,
      passed: ok,
      expectedOutput: tc.expectedOutput,
      actualOutput: output,
      verdict: ok ? 'OK' : 'WRONG_ANSWER',
    });
  }

  return {
    summary: { total: testCases.length, passed, failed: testCases.length - passed },
    results,
  };
}

async function runWithLocalPython(
  code: string,
  testCases: GoldenVerifyJobData['testCases'],
  timeLimitMs: number,
): Promise<GoldenVerifyWorkerResult> {
  const results: GoldenVerifyWorkerResult['results'] = [];
  let passed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]!;
    const expectedNorm = normalizeJudgeOutput(tc.expectedOutput);

    let run: Awaited<ReturnType<typeof runGoldenPythonInline>>;
    try {
      run = await runGoldenPythonInline(code, tc.input, timeLimitMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isPythonMissing = msg.includes('Không tìm thấy Python');
      results.push({
        index: i,
        passed: false,
        expectedOutput: tc.expectedOutput,
        stderr: msg,
        verdict: isPythonMissing ? 'PYTHON_NOT_FOUND' : 'RUNTIME_ERROR',
      });
      continue;
    }

    if (run.timedOut) {
      results.push({
        index: i,
        passed: false,
        expectedOutput: tc.expectedOutput,
        actualOutput: normalizeJudgeOutput(run.stdout),
        stderr: run.stderr || undefined,
        verdict: 'TIME_LIMIT',
      });
      break; // Tối ưu: Dừng ngay khi TLE
    }

    if (run.exitCode !== 0) {
      results.push({
        index: i,
        passed: false,
        expectedOutput: tc.expectedOutput,
        actualOutput: normalizeJudgeOutput(run.stdout),
        stderr: run.stderr || undefined,
        verdict: 'RUNTIME_ERROR',
      });
      continue; 
    }

    const actualNorm = normalizeJudgeOutput(run.stdout);
    const ok = actualNorm === expectedNorm;
    if (ok) passed++;
    results.push({
      index: i,
      passed: ok,
      expectedOutput: tc.expectedOutput,
      actualOutput: run.stdout,
      stderr: run.stderr || undefined,
      verdict: ok ? 'OK' : 'WRONG_ANSWER',
    });
  }

  return {
    summary: { total: testCases.length, passed, failed: testCases.length - passed },
    results,
  };
}

export async function processGoldenVerifyJob(
  job: Job<GoldenVerifyJobData>,
  deps: {
    lambdaClient: LambdaClient | null;
    lambdaFunctionName: string | undefined;
  },
): Promise<GoldenVerifyWorkerResult> {
  const { goldenSourceCode, language, testCases, timeLimitMs } = job.data;

  if (!testCases?.length) {
    throw new Error('golden-verify: testCases rỗng');
  }
  if (!goldenSourceCode?.trim()) {
    throw new Error('golden-verify: goldenSourceCode rỗng');
  }

  await job.updateProgress({ pct: 5, log: 'golden-verify start' });

  let lang: string;
  try {
    lang = normalizeGoldenVerifyLanguage(language);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'golden-verify: language invalid');
  }

  const useLambda = Boolean(deps.lambdaClient && deps.lambdaFunctionName);

  if (useLambda) {
    log.info(`golden-verify job=${job.id} path=lambda lang=${lang} cases=${testCases.length}`);
    await job.updateProgress({ pct: 20, log: 'golden-verify lambda' });
    return runWithLambda(
      deps.lambdaClient!,
      deps.lambdaFunctionName!,
      goldenSourceCode,
      lang,
      testCases,
      timeLimitMs,
    );
  }

  if (lang !== 'python') {
    const msg =
      `Worker không có Lambda: chỉ chạy golden Python trên máy này. ` +
      `Ngôn ngữ "${lang}" cần JUDGE_LAMBDA_FUNCTION_NAME (hoặc AWS_LAMBDA_FUNCTION_NAME) trùng hàm judge.`;
    const results: GoldenVerifyWorkerResult['results'] = testCases.map((tc, i) => ({
      index: i,
      passed: false,
      expectedOutput: tc.expectedOutput,
      stderr: msg,
      verdict: 'RUNTIME_ERROR' as const,
    }));
    return {
      summary: { total: testCases.length, passed: 0, failed: testCases.length },
      results,
    };
  }

  log.info(`golden-verify job=${job.id} path=local-python cases=${testCases.length}`);
  await job.updateProgress({ pct: 20, log: 'golden-verify local-python' });
  return runWithLocalPython(goldenSourceCode, testCases, timeLimitMs);
}
