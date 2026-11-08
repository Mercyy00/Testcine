import test from "node:test";
import assert from "node:assert/strict";
import {
  applyApiGuard,
  clampInt,
  getClientIp,
  resetMemoryRateLimits,
} from "../lib/api-guard.js";

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("clampInt applies defaults and bounds", () => {
  assert.equal(clampInt("12", 1, 20, 5), 12);
  assert.equal(clampInt("999", 1, 20, 5), 20);
  assert.equal(clampInt("-2", 1, 20, 5), 1);
  assert.equal(clampInt("nope", 1, 20, 5), 5);
});

test("client IP prefers the first trusted proxy value", () => {
  assert.equal(getClientIp({ headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.2" } }), "203.0.113.8");
  assert.equal(getClientIp({ headers: { "x-real-ip": "198.51.100.4" } }), "198.51.100.4");
});

test("local API limiter returns 429 after the configured allowance", async () => {
  resetMemoryRateLimits();
  const req = { url: "/api/test", headers: { "x-forwarded-for": "192.0.2.1" } };
  for (let i = 0; i < 3; i += 1) {
    assert.equal(await applyApiGuard(req, response(), { cacheSeconds: 0, limit: 3 }), true);
  }
  const res = response();
  assert.equal(await applyApiGuard(req, res, { cacheSeconds: 0, limit: 3 }), false);
  assert.equal(res.code, 429);
  assert.equal(res.headers["Retry-After"], "60");
});

test("cross-site browser requests are rejected", async () => {
  resetMemoryRateLimits();
  const res = response();
  const allowed = await applyApiGuard(
    { url: "/api/test", headers: { "sec-fetch-site": "cross-site" } },
    res,
    { cacheSeconds: 0 }
  );
  assert.equal(allowed, false);
  assert.equal(res.code, 403);
});
