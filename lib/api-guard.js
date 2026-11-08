// Server-side API guard for /api/* routes
// Enforces global or distributed rate limiting, input clamping, caching headers, and sanitizes errors

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min per IP
const memoryStore = new Map();

// Periodic cleanup of stale in-memory records
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now - entry.startTime > (entry.windowMs || RATE_LIMIT_WINDOW_MS) * 2) {
      memoryStore.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2).unref?.();

// Optional Upstash Redis initialization for Serverless/Edge
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redisClient = null;
let upstashRatelimit = null;

if (upstashUrl && upstashToken) {
  try {
    redisClient = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
    upstashRatelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, "60 s"),
      analytics: false,
      prefix: "vivarium_ratelimit",
    });
  } catch (e) {
    console.warn("Failed to initialize Upstash Redis ratelimiter, falling back to memory:", e.message);
  }
}

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
}

export async function checkRateLimit(key, { limit = MAX_REQUESTS_PER_WINDOW, windowMs = RATE_LIMIT_WINDOW_MS } = {}) {
  if (upstashRatelimit && redisClient) {
    try {
      const res = await upstashRatelimit.limit(key);
      return { success: res.success, remaining: res.remaining, reset: res.reset };
    } catch {
      // Fallback to memory on network/redis error
    }
  }

  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now - record.startTime > windowMs) {
    memoryStore.set(key, { count: 1, startTime: now, windowMs });
    return { success: true, remaining: limit - 1 };
  }

  record.count += 1;
  if (record.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - record.count };
}

export async function applyApiGuard(req, res, { cacheSeconds = 3600, limit = MAX_REQUESTS_PER_WINDOW, windowMs = RATE_LIMIT_WINDOW_MS, prefix = "global" } = {}) {
  // 1. Rate Limiting by client IP + route/prefix
  const clientIp = getClientIp(req);
  const routeKey = `${prefix}:${clientIp}:${req.url?.split("?")[0] || ""}`;

  const { success } = await checkRateLimit(routeKey, { limit, windowMs });
  if (!success) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many requests. Please try again shortly." });
    return false;
  }

  // 2. Browser Same-Site / Sec-Fetch-Site Check
  const fetchSite = req.headers?.["sec-fetch-site"];
  if (fetchSite && fetchSite === "cross-site") {
    res.status(403).json({ error: "Cross-site access denied." });
    return false;
  }

  // 3. Cache-Control Header
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
