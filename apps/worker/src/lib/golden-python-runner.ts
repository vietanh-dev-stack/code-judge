import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isENOENTError } from './spawn-errors';

export interface RunPythonResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function runWithStdin(
  command: string,
  args: readonly string[],
  stdin: string,
  timeoutMs: number,
): Promise<RunPythonResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (c: Buffer) => {
      stdout += c.toString('utf8');
    });
    child.stderr?.on('data', (c: Buffer) => {
      stderr += c.toString('utf8');
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      resolve({ exitCode: -1, stdout, stderr, timedOut: true });
    }, timeoutMs);

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr, timedOut: false });
    });

    child.stdin?.write(stdin, 'utf8');
    child.stdin?.end();
  });
}

export async function runGoldenPythonSource(
  sourceFilePath: string,
  stdin: string,
  timeoutMs: number,
): Promise<RunPythonResult> {
  const attempts =
    process.platform === 'win32'
      ? ([
          ['python', [sourceFilePath]],
          ['py', ['-3', sourceFilePath]],
        ] as const)
      : ([
          ['python3', [sourceFilePath]],
          ['python', [sourceFilePath]],
        ] as const);

  let lastErr: unknown;
  for (const [cmd, args] of attempts) {
    try {
      return await runWithStdin(cmd, args, stdin, timeoutMs);
    } catch (e) {
      lastErr = e;
      if (isENOENTError(e)) {
        continue;
      }
      throw e;
    }
  }
  throw new Error(
    `Không tìm thấy Python trên worker (đã thử: ${attempts.map((a) => a[0]).join(', ')}). Cài python3 hoặc cấu hình AWS Lambda. Chi tiết: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

export function normalizeJudgeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

export async function runGoldenPythonInline(
  source: string,
  stdin: string,
  timeoutMs: number,
): Promise<RunPythonResult> {
  const tmpFile = join(tmpdir(), `cj-golden-${randomUUID()}.py`);
  await writeFile(tmpFile, source, 'utf8');
  try {
    return await runGoldenPythonSource(tmpFile, stdin, timeoutMs);
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}
