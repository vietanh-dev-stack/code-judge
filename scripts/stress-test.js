/**
 * Simulate many submissions to the Core API /submissions endpoint.
 *
 * Usage:
 *   node scripts/simulate-submissions.js
 *
 * This uses the public submission endpoint in this project, which currently
 * accepts `userId`, `problemId`, `mode`, `language`, and `sourceCode`.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PROBLEM_ID = 'seed-problem-easy-02';
const CONTEST_ID = 'seed-contest-spring'; // Link to Spring Open 2026 contest to show in leaderboard
const TOTAL_SUBMISSIONS = 1000;
const CONCURRENCY = 50; // High concurrency to simulate simultaneous submission
const LANGUAGE = 'PYTHON';
const SOURCE_CODE = `
a = int(input())
b = int(input())
print(max(a, b))
`;

function requestOptions(body) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function getUserId(index) {
  return `seed-user-${index + 1}`;
}

async function submit(userId, retryCount = 0) {
  const payload = {
    userId,
    problemId: PROBLEM_ID,
    contestId: CONTEST_ID,
    mode: 'ALGO',
    language: LANGUAGE,
    sourceCode: SOURCE_CODE,
  };

  try {
    const res = await fetch(`${BASE_URL}/submissions`, requestOptions(payload));

    if (res.status === 429 && retryCount < 3) {
      // Rate limited, wait and retry
      const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Rate limited for user ${userId}, retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return submit(userId, retryCount + 1);
    }

    const body = await res.text();
    let json;
    try {
      json = JSON.parse(body);
    } catch (error) {
      json = body;
    }

    return {
      userId,
      status: res.status,
      ok: res.ok,
      result: json,
      retries: retryCount,
    };
  } catch (error) {
    if (retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`Network error for user ${userId}, retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return submit(userId, retryCount + 1);
    }

    return {
      userId,
      status: 0,
      ok: false,
      result: error.message,
      retries: retryCount,
    };
  }
}

async function run() {
  console.log(
    `Starting simulation: ${TOTAL_SUBMISSIONS} submissions with concurrency ${CONCURRENCY}`,
  );
  const startTime = Date.now();

  const pending = [];
  const results = [];

  for (let i = 0; i < TOTAL_SUBMISSIONS; i += 1) {
    const userId = getUserId(i);
    pending.push(submit(userId));

    if (pending.length >= CONCURRENCY) {
      const batch = await Promise.all(pending);
      results.push(...batch);
      pending.length = 0;
      console.log(`Submitted ${results.length}/${TOTAL_SUBMISSIONS}`);
    }
  }

  if (pending.length) {
    const batch = await Promise.all(pending);
    results.push(...batch);
  }

  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000; // seconds
  const requestsPerSecond = TOTAL_SUBMISSIONS / totalTime;

  const successCount = results.filter((item) => item.ok).length;
  const errorCount = results.length - successCount;
  const totalRetries = results.reduce((sum, item) => sum + (item.retries || 0), 0);

  console.log('\n=== RESULTS ===');
  console.log(`Total submissions: ${TOTAL_SUBMISSIONS}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Total retries: ${totalRetries}`);
  console.log(`Total time: ${totalTime.toFixed(2)} seconds`);
  console.log(`Requests/second: ${requestsPerSecond.toFixed(2)}`);
  console.log(
    `Average time per request: ${((totalTime / TOTAL_SUBMISSIONS) * 1000).toFixed(2)} ms`,
  );

  console.log('\nDone');
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  if (errorCount > 0) {
    console.log('Sample failures:');
    results
      .filter((item) => !item.ok)
      .slice(0, 10)
      .forEach((item) => {
        console.log(item.userId, item.status, item.result);
      });
  }
}

run().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
