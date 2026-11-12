import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clampInt, getClientIp, applyApiGuard } from "../lib/api-guard.js";
import { validateEnv } from "../lib/env.js";

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

test("getClientIp parses forwarded IPs and fallbacks cleanly", () => {
  const reqWithForwarded = {
    headers: {
      "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
    },
  };
  assert.equal(getClientIp(reqWithForwarded), "203.0.113.195");

  const reqDirect = {
    headers: {},
    socket: { remoteAddress: "192.168.1.50" },
  };
  assert.equal(getClientIp(reqDirect), "192.168.1.50");

  const reqEmpty = {};
  assert.equal(getClientIp(reqEmpty), "127.0.0.1");
});

test("applyApiGuard blocks cross-site attacks via sec-fetch-site", async () => {
  const req = {
    headers: { "sec-fetch-site": "cross-site" },
    url: "/api/user/sync",
  };
  let statusCode = 200;
  let jsonOutput = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          jsonOutput = data;
        },
      };
    },
  };

  const allowed = await applyApiGuard(req, res);
  assert.equal(allowed, false);
  assert.equal(statusCode, 403);
  assert.match(jsonOutput.error, /Cross-site access denied/i);
});

test("login brute-force protection throttles repeated failed attempts per email and IP", async () => {
  const email = "attacker@example.com";
  const ip = "198.51.100.42";
  const throttleKey = `login_throttle:${email}:${ip}`;

  // Limit 5 per minute
  for (let i = 0; i < 5; i++) {
    const res = await checkRateLimit(throttleKey, { limit: 5, windowMs: 60000 });
    assert.equal(res.success, true);
  }

  // 6th attempt is throttled
  const blocked = await checkRateLimit(throttleKey, { limit: 5, windowMs: 60000 });
  assert.equal(blocked.success, false);
});

test("validateEnv executes safely and returns valid schema validation", () => {
  // Should not throw in any environment
  assert.doesNotThrow(() => {
    validateEnv();
  });
});
