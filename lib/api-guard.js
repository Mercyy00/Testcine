// Shared server-side API protection. Production uses Upstash Redis so limits are
// enforced across serverless instances; local development uses an in-memory fallback.
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const memoryCounters = new Map();
const limiters = new Map();

const hasRedisConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const redis = hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export function getClientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req?.headers?.["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return req?.socket?.remoteAddress || "local";
}

function getRouteKey(req) {
  const raw = String(req?.url || "api").split("?")[0];
  return raw.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 160) || "api";
}

function getRedisLimiter({ namespace, limit, window }) {
  const cacheKey = `${namespace}:${limit}:${window}`;
  if (!limiters.has(cacheKey)) {
    limiters.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit, window),
        prefix: `vivarium:ratelimit:${namespace}`,
        analytics: false,
      })
    );
  }
  return limiters.get(cacheKey);
}

function memoryLimit(identifier, { limit, windowMs }) {
  const now = Date.now();
  const current = memoryCounters.get(identifier);
  if (!current || now >= current.reset) {
    const next = { count: 1, reset: now + windowMs };
    memoryCounters.set(identifier, next);
    return { success: true, remaining: limit - 1, reset: next.reset };
  }
  current.count += 1;
  return {
    success: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    reset: current.reset,
  };
}

/**
 * Rate limit an arbitrary identifier. `window` uses Upstash's duration format,
 * e.g. "1 m" or "15 m". In production Redis configuration is mandatory.
 */
export async function checkRateLimit({
  identifier,
  namespace = "api",
  limit = MAX_REQUESTS_PER_WINDOW,
  window = "1 m",
  windowMs = RATE_LIMIT_WINDOW_MS,
}) {
  if (redis) {
    return getRedisLimiter({ namespace, limit, window }).limit(identifier);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Global rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return memoryLimit(`${namespace}:${identifier}`, { limit, windowMs });
}

export async function applyApiGuard(
  req,
  res,
  { cacheSeconds = 3600, limit = MAX_REQUESTS_PER_WINDOW, namespace } = {}
) {
  try {
    const route = namespace || getRouteKey(req);
    const result = await checkRateLimit({
      identifier: `${getClientIp(req)}:${route}`,
      namespace: "api",
      limit,
    });
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    if (!result.success) {
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
      return false;
    }
  } catch (error) {
    console.error("Rate limiter error:", error.message);
    res.status(503).json({ error: "Request protection is temporarily unavailable." });
    return false;
  }

  const fetchSite = req.headers?.["sec-fetch-site"];
  if (fetchSite === "cross-site") {
    res.status(403).json({ error: "Cross-site access denied." });
    return false;
  }

  if (cacheSeconds > 0) {
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
    );
  }
  return true;
}

export function clampInt(val, min, max, defaultVal) {
  const num = parseInt(val, 10);
  if (Number.isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

export function handleApiError(res, error, publicMessage = "An error occurred while processing your request") {
  console.error("API server error:", error);
  return res.status(500).json({ error: publicMessage });
}

// Test-only helper; harmless in development and not exposed through an API route.
export function resetMemoryRateLimits() {
  memoryCounters.clear();
}
