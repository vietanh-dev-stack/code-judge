import 'dotenv/config';
import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, SubmissionStatus } from '@prisma/client';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { processGoldenVerifyJob } from './golden-verify-job';
import { GOLDEN_VERIFY_QUEUE_NAME, JUDGE_SUBMISSIONS_QUEUE_NAME } from './lib/constants';
import { getOptionalEnv, getRequiredEnv } from './lib/env';
import { createWorkerLogger } from './lib/logger';
import { sleep } from './lib/sleep';
import { putArtifactObject, getObjectString } from './lib/storage';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const log = createWorkerLogger('worker');

// Redis: BullMQ yêu cầu `maxRetriesPerRequest: null` khi dùng làm connection.
const redisUrl = getOptionalEnv(process.env.REDIS_URL, 'redis://localhost:6379');
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Prisma 7: bắt buộc có adapter Postgres.
const connectionString = getRequiredEnv('DATABASE_URL', process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const lambdaFunctionName = process.env.AWS_LAMBDA_FUNCTION_NAME?.trim() ?? '';
/** Lambda dùng cho chấm submission (có thể khác golden). Mặc định trùng AWS_LAMBDA_FUNCTION_NAME. */
const judgeLambdaFunctionName =
  (process.env.JUDGE_LAMBDA_FUNCTION_NAME?.trim() || lambdaFunctionName || '').trim();
/** `lambda` = chấm submission qua Lambda (để test). `judge0` = Judge0 HTTP (mặc định). */
const judgeEngine = getOptionalEnv(process.env.JUDGE_ENGINE, 'judge0').toLowerCase();

const awsRegion = getOptionalEnv(
  process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
  'us-east-1',
);
const needsLambdaClient =
  Boolean(lambdaFunctionName) || (judgeEngine === 'lambda' && Boolean(judgeLambdaFunctionName));
const lambdaClient = needsLambdaClient
  ? new LambdaClient({
      region: awsRegion,
      credentials: {
        accessKeyId: getRequiredEnv('AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID),
        secretAccessKey: getRequiredEnv('AWS_SECRET_ACCESS_KEY', process.env.AWS_SECRET_ACCESS_KEY),
      },
    })
  : null;

const useLambdaForJudge =
  judgeEngine === 'lambda' && Boolean(judgeLambdaFunctionName) && Boolean(lambdaClient);
const judge0Url = getOptionalEnv(process.env.JUDGE0_URL, 'http://localhost:2358');

if (judgeEngine === 'lambda' && !useLambdaForJudge) {
  log.warn(
    'JUDGE_ENGINE=lambda nhưng không invoke được Lambda (thiếu tên hàm hoặc AWS credentials). Sẽ fallback Judge0/stub.',
  );
}

// Cache for compiled binaries: hash(lang + code) -> { binary: Buffer, fileName: string }
const compilationCache = new Map<string, { binary: Buffer; fileName: string }>();

function tryParseJson(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getJudge0LanguageId(language: string): number {
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
      return 71; // Default to Python
  }
}

function normalizeOutput(out: string): string {
  if (!out) return '';
  return out
    .replace(/\r\n/g, '\n') // Normalize line endings
    .split('\n')
    .map((line) => line.trimEnd()) // Trim each line
    .join('\n')
    .trim(); // Trim overall output
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

/**
 * Xử lý một job chấm bài (hiện tại là stub).
 *
 * @param job - job BullMQ; `job.data.submissionId` khớp với id bản ghi `Submission` trong DB.
 */
async function processSubmission(job: any) {
  const { submissionId } = job.data as { submissionId: string };

  const existingSubmission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      logs: true,
      userId: true,
      problemId: true,
      contestId: true,
      language: true,
      sourceCode: true,
      sourceCodeObjectKey: true,
      isDryRun: true,
    },
  });

  if (!existingSubmission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  // Lấy thông tin problem và test cases
  const problem = await prisma.problem.findUnique({
    where: { id: existingSubmission.problemId },
    select: {
      id: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      testCases: {
        select: {
          id: true,
          orderIndex: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
          weight: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!problem) {
    throw new Error(`Problem not found: ${existingSubmission.problemId}`);
  }

  let testCasesToRun = problem.testCases;

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.Running,
      logs: existingSubmission.logs ?? '',
    },
  });

  job.updateProgress({ pct: 10, log: 'Starting judge process.' });

  

  let sourceCode = existingSubmission.sourceCode;
  if (!sourceCode && existingSubmission.sourceCodeObjectKey) {
    try {
      sourceCode = await getObjectString(existingSubmission.sourceCodeObjectKey);
      log.info(
        `Loaded source code from MinIO object ${existingSubmission.sourceCodeObjectKey} (len=${sourceCode.length})`,
      );
      console.log(
        `Loaded source code from MinIO object ${existingSubmission.sourceCodeObjectKey} (len=${sourceCode.length})`,
      );
    } catch (storageError) {
      const errorMessage = `Failed to load source from MinIO object ${existingSubmission.sourceCodeObjectKey}: ${(storageError as Error).message}`;
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.Error,
          error: errorMessage,
          logs: `${existingSubmission.logs ?? ''}\n${errorMessage}`,
        },
      });
      throw new Error(errorMessage);
    }
  }

  // --- Debug Logs ---
  console.log(`[worker] Processing Submission: ${submissionId}`);
  console.log(`[worker] Language: ${existingSubmission.language}, Problem: ${existingSubmission.problemId}`);

  if (!sourceCode) {
    const errorMessage = 'Submission source code is missing or empty';
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.Error,
        error: errorMessage,
        logs: `${existingSubmission.logs ?? ''}\n${errorMessage}`,
      },
    });
    throw new Error(errorMessage);
  }

  // --- Chấm bài: Lambda (JUDGE_ENGINE=lambda) hoặc Judge0 ---
  if (!useLambdaForJudge && judge0Url) {
    const testCaseResults = [];
    let totalScore = 0;
    let totalWeight = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let combinedLogs = '';
    let finalStatus: SubmissionStatus = SubmissionStatus.Accepted;
    let stopEarly = false;

    const languageId = getJudge0LanguageId(existingSubmission.language as string);
    job.updateProgress({ pct: 20, log: `Judging with Judge0 (ID: ${languageId})...` });

    try {
      for (let i = 0; i < testCasesToRun.length; i++) {
      const testCase = testCasesToRun[i];
      totalWeight += testCase.weight;

      if (stopEarly) {
        testCaseResults.push({
          testCaseId: testCase.id,
          status: 'Skipped',
          runtimeMs: 0,
          memoryMb: 0,
          output: '',
          error: null,
          passed: false,
          isHidden: testCase.isHidden,
        });
        continue;
      }

      try {
        const encodedCode = Buffer.from(sourceCode).toString('base64');
        const encodedInput = Buffer.from(testCase.input || '').toString('base64');
        const encodedExpected = Buffer.from(testCase.expectedOutput || '').toString('base64');

        // 1. Submit
        const submitResponse = await axios.post(`${judge0Url}/submissions?base64_encoded=true`, {
          source_code: encodedCode,
          language_id: languageId,
          stdin: encodedInput,
          expected_output: encodedExpected,
          cpu_time_limit: problem.timeLimitMs / 1000,
          memory_limit: problem.memoryLimitMb * 1024,
        }, { timeout: 10000 });

        const { token } = submitResponse.data;

        // 2. Poll
        let result: any = null;
        let pollRetries = 30;
        while (pollRetries > 0) {
          const pollResponse = await axios.get(`${judge0Url}/submissions/${token}?base64_encoded=true`, { timeout: 5000 });
          if (pollResponse.data.status.id > 2) {
            result = pollResponse.data;
            break;
          }
          await sleep(1000);
          pollRetries--;
        }

        if (!result) throw new Error(`Judge0 result timeout (token: ${token})`);

        // 3. Process Result
        const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : '';
        const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '';
        const compileOut = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : '';
        
        const runtimeMs = Math.round((result.time || 0) * 1000);
        const memoryMb = Math.round((result.memory || 0) / 1024);
        maxTime = Math.max(maxTime, runtimeMs);
        maxMemory = Math.max(maxMemory, memoryMb);

        const normalizedActual = normalizeOutput(stdout);
        const normalizedExpected = normalizeOutput(testCase.expectedOutput || '');
        const isMatch = normalizedActual === normalizedExpected;

        console.log('result', result)

        let caseStatus: string = 'Wrong';
        const sId = result.status?.id;

        if (sId === 3) {
          caseStatus = 'Accepted';
        } else if (sId === 5) {
          caseStatus = 'TimeLimitExceeded';
        } else {
          caseStatus = 'Wrong';
        }

        // Ưu tiên kết quả so khớp output nếu không phải bị quá thời gian
        if (isMatch && caseStatus !== 'TimeLimitExceeded') {
          caseStatus = 'Accepted';
        }

        const passed = caseStatus === 'Accepted';
        if (passed) totalScore += testCase.weight;

        testCaseResults.push({
          testCaseId: testCase.id,
          status: caseStatus,
          runtimeMs,
          memoryMb,
          output: stdout,
          error: stderr || null,
          passed,
          isHidden: testCase.isHidden,
        });

        // Cập nhật trạng thái tổng quát
        if (caseStatus === 'TimeLimitExceeded') {
          finalStatus = SubmissionStatus.TimeLimitExceeded;
          break; // TLE thì vẫn nên dừng để tiết kiệm tài nguyên
        } else if (!passed && finalStatus === SubmissionStatus.Accepted) {
          finalStatus = SubmissionStatus.Wrong;
        }

        if (passed) {
          combinedLogs += `Test case ${i + 1}: PASSED (${runtimeMs}ms, ${memoryMb}MB)\n`;
        } else {
          combinedLogs += `Test case ${i + 1}: ${caseStatus.toUpperCase()}\n`;
          if (testCase.isHidden) {
            combinedLogs += `[Hidden Test Case]\n`;
          } else {
            combinedLogs += `--- Input ---\n${testCase.input.substring(0, 100)}\n`;
            combinedLogs += `--- Expected Output ---\n${testCase.expectedOutput.trim()}\n`;
            combinedLogs += `--- Actual Output ---\n${stdout.trim()}\n`;
            if (stderr) combinedLogs += `--- Stderr ---\n${stderr.substring(0, 200)}\n`;
          }
          combinedLogs += `-------------------\n`;
        }

      } catch (err: any) {
        const errMsg = err.message || 'Judge execution failed';
        testCaseResults.push({
          testCaseId: testCase.id,
          status: 'Wrong',
          runtimeMs: 0,
          memoryMb: 0,
          output: '',
          error: errMsg,
          passed: false,
          isHidden: testCase.isHidden,
        });
        if (finalStatus === SubmissionStatus.Accepted) finalStatus = SubmissionStatus.Wrong;
        combinedLogs += `Test case ${i + 1}: WRONG (Judge Error: ${errMsg})\n`;
      }

      job.updateProgress({ 
        pct: 20 + Math.round(((i + 1) / testCasesToRun.length) * 70), 
        log: `Case ${i + 1}/${testCasesToRun.length} done.` 
      });
    }

    // Final Update
    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
    const logObjectKey = `submissions/${submissionId}/artifacts/judge.log`;
    
    await putArtifactObject(logObjectKey, combinedLogs, { submissionId, contentType: 'text/plain' });

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: finalStatus,
        score: finalScore,
        runtimeMs: maxTime,
        memoryMb: maxMemory,
        testsPassed: testCaseResults.filter(r => r.passed).length,
        testsTotal: testCasesToRun.length,
        logs: combinedLogs,
        caseResults: {
          logObjectKey,
          testCases: testCaseResults,
        },
      },
    });

    job.updateProgress({ pct: 100, log: `Finished: ${finalStatus} (${finalScore}%)` });
    return { submissionId, status: finalStatus, score: finalScore };

    } catch (error) {
      log.error(`Judge0 error: ${(error as Error).message}`);
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.Wrong,
          error: (error as Error).message,
          logs: `${combinedLogs}\nSystem Error: ${(error as Error).message}`,
        },
      });
      throw error;
    }
  } else if (useLambdaForJudge) {
    if (!lambdaClient) {
      throw new Error('Lambda client missing while useLambdaForJudge');
    }
    try {
      const testCaseResults = [];
      let totalScore = 0;
      let totalWeight = 0;
      let logs = '';
      let hasError = false;

      const payloadObj = {
        submissionId,
        userId: existingSubmission.userId,
        problemId: existingSubmission.problemId,
        contestId: existingSubmission.contestId,
        language: (existingSubmission.language as string).toLowerCase(),
        code: sourceCode,
        sourceCodeObjectKey: existingSubmission.sourceCodeObjectKey,
        timeLimit: problem.timeLimitMs,
        memoryLimitMb: problem.memoryLimitMb,
        bucket: getOptionalEnv(process.env.MINIO_BUCKET, 'codejudge'),
        testCases: testCasesToRun.map((testCase: any) => ({
          id: testCase.id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          isHidden: testCase.isHidden,
          weight: testCase.weight,
          orderIndex: testCase.orderIndex,
        })),
        // Thêm flag để Lambda biết có thể xử lý song song
        enableParallelExecution: true,
      };

      const payload = JSON.stringify(payloadObj);
      console.log('Lambda request payload:', payloadObj);

      const command = new InvokeCommand({
        FunctionName: judgeLambdaFunctionName,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(payload),
      });

      const response = await lambdaClient.send(command);
      const responsePayload = response.Payload
        ? Buffer.from(response.Payload).toString('utf8')
        : null;

      console.log('Lambda raw response payload:', responsePayload);

      let lambdaResult: any = null;
      if (responsePayload) {
        lambdaResult = unwrapLambdaResult(responsePayload);
      }

      if (response.FunctionError || response.StatusCode !== 200 || !lambdaResult) {
        logs += `Lambda invocation failed\n`;
        logs += `  responseFunctionError=${response.FunctionError} statusCode=${response.StatusCode}\n`;
        logs += `  payload=${responsePayload}\n`;
        hasError = true;
      } else if (lambdaResult.compileError) {
        logs += `Compile error:\n${lambdaResult.compileError}\n`;
        hasError = true;
      } else if (!Array.isArray(lambdaResult.results)) {
        logs += 'Unexpected Lambda result format\n';
        logs += `payload=${responsePayload}\n`;
        hasError = true;
      } else {
        for (let i = 0; i < testCasesToRun.length; i++) {
          const testCase = testCasesToRun[i];
          const resultItem = lambdaResult.results[i] ?? {};
          const output = String(resultItem.output ?? '').trim();
          const expectedOutput = testCase.expectedOutput.trim();
          const passed = resultItem.status === 'ACCEPTED' && output === expectedOutput;

          const caseResult = {
            testCaseId: testCase.id,
            status: String(resultItem.status ?? 'Error'),
            runtimeMs: resultItem.time ?? null,
            memoryMb: resultItem.memory ?? null,
            output,
            error:
              resultItem.status === 'ACCEPTED'
                ? null
                : String(resultItem.output ?? resultItem.stderr ?? ''),
            passed,
            isHidden: testCase.isHidden,
          };

          testCaseResults.push(caseResult);

          if (passed) {
            console.log(`Test case ${i + 1}: PASSED`);
            totalScore += testCase.weight;
            logs += `Test case ${i + 1}: PASSED (weight: ${testCase.weight})\n`;
          } else {
            console.log(`Test case ${i + 1}: FAILED`);
            logs += `Test case ${i + 1}: FAILED\n`;
            if (testCase.isHidden) {
              logs += `  [Hidden Test Case]\n`;
            } else {
              logs += `  Expected: ${expectedOutput}\n`;
              logs += `  Got: ${output}\n`;
            }
          }

          totalWeight += testCase.weight;
        }
      }

      const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
      let finalStatus: SubmissionStatus = SubmissionStatus.Accepted;
      if (hasError) {
        finalStatus = SubmissionStatus.Error;
      } else if (finalScore === 0) {
        finalStatus = SubmissionStatus.Wrong;
      } else if (finalScore < 100) {
        finalStatus = SubmissionStatus.Wrong;
      }

      const logObjectKey = `submissions/${submissionId}/artifacts/judge.log`;
      await putArtifactObject(logObjectKey, logs, {
        submissionId,
        contentType: 'text/plain',
      });

      const updateData: any = {
        status: finalStatus,
        score: finalScore,
        runtimeMs: testCaseResults.reduce((max, r) => Math.max(max, r.runtimeMs || 0), 0),
        memoryMb: testCaseResults.reduce((max, r) => Math.max(max, r.memoryMb || 0), 0),
        testsPassed: testCaseResults.filter(r => r.passed).length,
        testsTotal: testCasesToRun.length,
        logs,
        caseResults: {
          logObjectKey,
          testCases: testCaseResults,
        },
      };

      await prisma.submission.update({ where: { id: submissionId }, data: updateData });
      job.updateProgress({ pct: 100, log: 'Finished judging all test cases.' });
      return { submissionId, status: finalStatus, score: finalScore };
    } catch (lambdaError) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.Error,
          error: (lambdaError as Error).message,
          logs: `${existingSubmission.logs ?? ''}\nLambda error: ${(lambdaError as Error).message}`,
        },
      });
      job.updateProgress({ pct: 100, log: 'Lambda judge failed.' });
      throw lambdaError;
    }
  }

  // Fallback: stub khi không Lambda và không Judge0
  job.updateProgress({ pct: 50, log: 'Running tests (stub — không cấu hình Judge0/Lambda).' });
  await sleep(800);

  const logObjectKey = `submissions/${submissionId}/artifacts/judge.log`;
  await putArtifactObject(logObjectKey, 'Accepted (stub - no Lambda)\n', {
    submissionId,
    contentType: 'text/plain',
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.Accepted,
      score: 100,
      runtimeMs: 123,
      memoryMb: 64,
      logs: `Accepted (stub - no Lambda)\n`,
      testsPassed: testCasesToRun.length,
      testsTotal: testCasesToRun.length,
      caseResults: {
        logObjectKey,
        testCases: [],
      } as any,
    },
  });

  job.updateProgress({ pct: 100, log: 'Finished (stub).' });
  return { submissionId, status: SubmissionStatus.Accepted };
}

async function main() {
  const judgeWorker = new Worker(JUDGE_SUBMISSIONS_QUEUE_NAME, processSubmission, {
    connection,
    concurrency: 10,
  });

  judgeWorker.on('completed', (job) => {
    log.info(`judge completed job=${job?.id}`);
  });

  judgeWorker.on('failed', (job, err) => {
    log.error(`judge failed job=${job?.id} err=${err?.message}`);
  });

  const goldenWorker = new Worker(
    GOLDEN_VERIFY_QUEUE_NAME,
    (job) => processGoldenVerifyJob(job, { lambdaClient, lambdaFunctionName }),
    {
      connection,
      concurrency: 5,
    },
  );

  goldenWorker.on('completed', (job) => {
    log.info(`golden-verify completed job=${job?.id}`);
  });

  goldenWorker.on('failed', (job, err) => {
    log.error(`golden-verify failed job=${job?.id} err=${err?.message}`);
  });

  log.info(
    `listening queues=${JUDGE_SUBMISSIONS_QUEUE_NAME},${GOLDEN_VERIFY_QUEUE_NAME} redis=${redisUrl} ` +
      `submissionJudge=${useLambdaForJudge ? 'lambda' : judge0Url ? 'judge0' : 'stub'} ` +
      `(JUDGE_ENGINE=${judgeEngine})`,
  );
}

main().catch((err) => {
  log.error(err);
  process.exit(1);
});
