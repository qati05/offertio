import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter with Upstash Redis (production) or in-memory fallback (dev).
 *
 * Required env vars for production:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

const hasUpstash =
  typeof process !== "undefined" &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN;

// ── Upstash Redis rate limiter ──
let upstashLimiters: Map<string, Ratelimit> | null = null;

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  if (!upstashLimiters) upstashLimiters = new Map();
  const key = `${limit}:${windowMs}`;
  if (!upstashLimiters.has(key)) {
    upstashLimiters.set(
      key,
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
        analytics: true,
      })
    );
  }
  return upstashLimiters.get(key)!;
}

// ── In-memory fallback (dev / no Redis) ──
const memRequests = new Map<string, { count: number; resetAt: number }>();

function memRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = memRequests.get(key);

  if (!entry || now > entry.resetAt) {
    memRequests.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: limit - entry.count };
}

// Cleanup stale in-memory entries every 5 minutes
if (typeof globalThis !== "undefined" && !hasUpstash) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memRequests) {
      if (now > entry.resetAt) memRequests.delete(key);
    }
  }, 300_000);
}

// ── Unified API ──

export async function rateLimitAsync(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000
): Promise<{ ok: boolean; remaining: number }> {
  if (hasUpstash) {
    try {
      const limiter = getUpstashLimiter(limit, windowMs);
      const { success, remaining } = await limiter.limit(key);
      return { ok: success, remaining };
    } catch {
      // Redis unavailable — fall back to in-memory limiter.
      // Log server-side so ops can detect Redis outages.
      if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        console.warn(JSON.stringify({ level: "warn", context: "rate-limit", message: "Redis unavailable, falling back to in-memory limiter", key, ts: new Date().toISOString() }));
      }
    }
  }
  return memRateLimit(key, limit, windowMs);
}

/**
 * Synchronous rate limiter — uses in-memory fallback only.
 * Kept for backwards compatibility with existing sync callers.
 */
export function rateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000
): { ok: boolean; remaining: number } {
  return memRateLimit(key, limit, windowMs);
}
