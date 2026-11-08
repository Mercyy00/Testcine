import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clampInt } from "../lib/api-guard.js";

test("clampInt correctly bounds values within min and max", () => {
  assert.equal(clampInt("5", 1, 10, 1), 5);
  assert.equal(clampInt("0", 1, 10, 1), 1);
  assert.equal(clampInt("100", 1, 10, 1), 10);
  assert.equal(clampInt("invalid", 1, 10, 3), 3);
});

test("checkRateLimit allows requests up to the limit and blocks after", async () => {
  const key = `test_rate_limit_${Date.now()}`;
  const limit = 3;

  const res1 = await checkRateLimit(key, { limit, windowMs: 1000 });
  assert.equal(res1.success, true);

  const res2 = await checkRateLimit(key, { limit, windowMs: 1000 });
  assert.equal(res2.success, true);

  const res3 = await checkRateLimit(key, { limit, windowMs: 1000 });
  assert.equal(res3.success, true);

  // 4th request exceeds limit of 3
  const res4 = await checkRateLimit(key, { limit, windowMs: 1000 });
  assert.equal(res4.success, false);
});
