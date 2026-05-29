import axios from 'axios';
import { parseJudge0MemoryMb, parseJudge0RuntimeMs } from './judge0-metrics';
import { mapJudge0Status, type Judge0CaseVerdict } from './judge0-verdict';
import { sleep } from './sleep';

export type Judge0RunParams = {
  judge0Url: string;
  sourceCode: string;
  languageId: number;
  stdin: string;
  expectedOutput?: string;
  cpuTimeLimitSec: number;
  wallTimeLimitSec: number;
  memoryLimitKb: number;
  pollRetries?: number;
};

export type Judge0RunResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  runtimeMs: number;
  memoryMb: number;
  verdict: Judge0CaseVerdict;
  statusId?: number;
  statusDescription?: string;
};

export function getJudge0LanguageId(language: string): number {
  const normalized = language?.trim().toUpperCase();
  switch (normalized) {
    case 'PYTHON':
      return 71;
    case 'JAVASCRIPT':
    case 'JS':
      return 63;
    case 'JAVA':
      return 62;
    case 'CPP':
    case 'C++':
      return 53;
    case 'GO':
    case 'GOLANG':
      return 60;
    case 'RUST':
    case 'RS':
      return 73;
    default:
      return 71;
  }
}

export async function runJudge0Submission(params: Judge0RunParams): Promise<Judge0RunResult> {
  const {
    judge0Url,
    sourceCode,
    languageId,
    stdin,
    expectedOutput,
    cpuTimeLimitSec,
    wallTimeLimitSec,
    memoryLimitKb,
    pollRetries = 30,
  } = params;

  const encodedCode = Buffer.from(sourceCode).toString('base64');
  const encodedInput = Buffer.from(stdin || '').toString('base64');
  const body: Record<string, unknown> = {
    source_code: encodedCode,
    language_id: languageId,
    stdin: encodedInput,
    cpu_time_limit: cpuTimeLimitSec,
    wall_time_limit: wallTimeLimitSec,
    cpu_extra_time: 0.5,
    memory_limit: memoryLimitKb,
  };
  if (expectedOutput != null) {
    body.expected_output = Buffer.from(expectedOutput).toString('base64');
  }

  const submitResponse = await axios.post(`${judge0Url}/submissions?base64_encoded=true`, body, {
    timeout: 15_000,
  });
  const { token } = submitResponse.data as { token: string };

  let result: Record<string, unknown> | null = null;
  let retries = pollRetries;
  while (retries > 0) {
    const pollResponse = await axios.get(`${judge0Url}/submissions/${token}?base64_encoded=true`, {
      timeout: 5000,
    });
    const data = pollResponse.data as { status?: { id?: number } };
    if (data.status?.id != null && data.status.id > 2) {
      result = pollResponse.data as Record<string, unknown>;
      break;
    }
    await sleep(1000);
    retries--;
  }

  if (!result) {
    throw new Error(`Judge0 result timeout (token: ${token})`);
  }

  const stdout = result.stdout
    ? Buffer.from(String(result.stdout), 'base64').toString('utf-8')
    : '';
  const stderr = result.stderr
    ? Buffer.from(String(result.stderr), 'base64').toString('utf-8')
    : '';
  const compileOutput = result.compile_output
    ? Buffer.from(String(result.compile_output), 'base64').toString('utf-8')
    : '';

  const runtimeMs = parseJudge0RuntimeMs(
    result as Parameters<typeof parseJudge0RuntimeMs>[0],
    cpuTimeLimitSec,
  );
  const memoryMb = parseJudge0MemoryMb(result as Parameters<typeof parseJudge0MemoryMb>[0]);
  const verdict = mapJudge0Status({
    status: result.status as { id?: number; description?: string },
    message: result.message as string | null,
  });

  return {
    stdout,
    stderr,
    compileOutput,
    runtimeMs,
    memoryMb,
    verdict,
    statusId: (result.status as { id?: number })?.id,
    statusDescription: (result.status as { description?: string })?.description,
  };
}
