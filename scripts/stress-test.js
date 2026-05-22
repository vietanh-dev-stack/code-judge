/**
 * Stress-test POST /submissions (requires JWT cookie after login).
 *
 * Usage:
 *   node scripts/stress-test.js
 *
 * Env:
 *   BASE_URL (default http://localhost:3000)
 *   STRESS_EMAIL (default seed-student1@codejudge.io)
 *   STRESS_PASSWORD (default password123)
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const STRESS_EMAIL = process.env.STRESS_EMAIL || 'seed-student1@codejudge.io';
const STRESS_PASSWORD = process.env.STRESS_PASSWORD || 'password123';
const PROBLEM_ID = process.env.STRESS_PROBLEM_ID || 'seed-problem-easy-02';
const CONTEST_ID = process.env.STRESS_CONTEST_ID || 'seed-contest-code-war';
const TOTAL_SUBMISSIONS = Number(process.env.TOTAL_SUBMISSIONS || 1000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 50);
const LANGUAGE = 'PYTHON';
const SOURCE_CODE = `
a = int(input())
b = int(input())
print(max(a, b))
`;

function collectCookieHeader(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    const parts = res.headers.getSetCookie();
    return parts.map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
  }
  const single = res.headers.get('set-cookie');
  if (!single) return '';
  return single
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STRESS_EMAIL, password: STRESS_PASSWORD }),
  });
  const cookie = collectCookieHeader(res);
  if (!res.ok || !cookie.includes('accessToken')) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  return cookie;
}

async function submit(cookie, index, retryCount = 0) {
  const payload = {
    problemId: PROBLEM_ID,
    contestId: CONTEST_ID,
    mode: 'ALGO',
    language: LANGUAGE,
    sourceCode: SOURCE_CODE,
  };

  try {
    const res = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 429 && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return submit(cookie, index, retryCount + 1);
    }

    const body = await res.text();
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      json = body;
    }

    return {
      index,
      status: res.status,
      ok: res.ok,
      result: json,
      retries: retryCount,
    };
  } catch (error) {
    if (retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return submit(cookie, index, retryCount + 1);
    }
    return {
      index,
      status: 0,
      ok: false,
      result: error.message,
      retries: retryCount,
    };
  }
}

async function run() {
  console.log(`Login as ${STRESS_EMAIL} ...`);
  const cookie = await login();
  console.log(
    `Starting simulation: ${TOTAL_SUBMISSIONS} submissions (concurrency ${CONCURRENCY})`,
  );
  const startTime = Date.now();

  const pending = [];
  const results = [];

  for (let i = 0; i < TOTAL_SUBMISSIONS; i += 1) {
    pending.push(submit(cookie, i));

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

  const totalTime = (Date.now() - startTime) / 1000;
  const successCount = results.filter((item) => item.ok).length;
  const errorCount = results.length - successCount;

  console.log('\n=== RESULTS ===');
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Total time: ${totalTime.toFixed(2)}s`);
  console.log(`Requests/s: ${(TOTAL_SUBMISSIONS / totalTime).toFixed(2)}`);

  if (errorCount > 0) {
    console.log('Sample failures:');
    results
      .filter((item) => !item.ok)
      .slice(0, 5)
      .forEach((item) => {
        console.log(item.index, item.status, item.result);
      });
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
