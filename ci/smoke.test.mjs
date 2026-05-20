/**
 * Smoke test tối thiểu cho CI (Node built-in test runner).
 * Mở rộng sau: thêm *.test.ts trong từng workspace hoặc gọi `npm test -ws --if-present`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

test('ci smoke: monorepo sanity', () => {
  assert.equal(1 + 1, 2);
});
