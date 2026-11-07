// Server-side API guard for /api/tmdb/* routes
// Enforces rate limiting, input clamping, caching headers, and sanitizes errors

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min per IP
const ipRequests = new Map();

// Periodic cleanup of stale rate-limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequests.entries()) {
    if (now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
      ipRequests.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2).unref?.();

export function applyApiGuard(req, res, { cacheSeconds = 3600 } = {}) {
  // 1. Rate Limiting by client IP
  const forwarded = req.headers["x-forwarded-for"];
  const clientIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "local";
  
  const now = Date.now();
  const record = ipRequests.get(clientIp);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    ipRequests.set(clientIp, { count: 1, startTime: now });
  } else {
    record.count += 1;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      res.setHeader("Retry-After", "60");
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
      return false;
    }
  }

  // 2. Browser Same-Site / Sec-Fetch-Site Check
  const fetchSite = req.headers["sec-fetch-site"];
  if (fetchSite && fetchSite === "cross-site") {
    // Block unauthorized cross-site requests to TMDB proxy
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
  console.error("TMDB API server error:", error);
  return res.status(500).json({ error: publicMessage });
}
