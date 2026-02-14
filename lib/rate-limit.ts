/**
 * Rate limiting using Upstash Redis with in-memory fallback.
 * 
 * If UPSTASH_REDIS_REST_URL + TOKEN are set → uses Redis (distributed).
 * Otherwise → uses a simple in-memory sliding window (single-instance).
 * 
 * The in-memory fallback protects against brute force & spam even without
 * Redis configured. It resets on server restart and is per-instance only.
 */

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

// Route-specific limits: [max requests, window in seconds]
const ROUTE_LIMITS: Record<string, [number, number]> = {
  '/login': [5, 60],         // 5 attempts per minute
  '/registro': [3, 300],     // 3 registrations per 5 min
  '/nuevo-hilo': [10, 60],   // 10 threads per minute
  '/api/': [60, 60],         // 60 API calls per minute
};
const DEFAULT_LIMIT: [number, number] = [100, 60]; // 100 req/min

function getLimitForPath(pathname: string): [number, number] {
  for (const [path, limit] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(path)) return limit;
  }
  return DEFAULT_LIMIT;
}

// =============================================
// IN-MEMORY SLIDING WINDOW RATE LIMITER
// =============================================

const memoryStore = new Map<string, number[]>();
const MEMORY_CLEANUP_INTERVAL = 60_000; // Clean stale entries every 60s
const MAX_MEMORY_KEYS = 10_000; // Cap to prevent memory leaks

let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(() => {
    const now = Date.now();
    Array.from(memoryStore.entries()).forEach(([key, timestamps]) => {
      const filtered = timestamps.filter((t: number) => now - t < 600_000); // keep last 10 min
      if (filtered.length === 0) {
        memoryStore.delete(key);
      } else {
        memoryStore.set(key, filtered);
      }
    });
  }, MEMORY_CLEANUP_INTERVAL);
  // Don't keep the process alive just for cleanup
  if (_cleanupTimer && typeof _cleanupTimer === 'object' && 'unref' in _cleanupTimer) {
    _cleanupTimer.unref();
  }
}

function checkMemoryRateLimit(
  identifier: string,
  maxRequests: number,
  windowSec: number
): RateLimitResult {
  ensureCleanupTimer();

  const now = Date.now();
  const windowMs = windowSec * 1000;
  const key = identifier;

  let timestamps = memoryStore.get(key) || [];
  // Remove expired entries
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    const oldestInWindow = timestamps[0];
    const resetAt = oldestInWindow + windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }

  // Enforce global cap to prevent unbounded memory growth
  if (memoryStore.size >= MAX_MEMORY_KEYS && !memoryStore.has(key)) {
    // Allow but don't track — graceful degradation
    return { allowed: true, remaining: 1, resetAt: now + windowMs };
  }

  timestamps.push(now);
  memoryStore.set(key, timestamps);

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetAt: now + windowMs,
  };
}

// =============================================
// UPSTASH REDIS RATE LIMITER
// =============================================

let _ratelimit: { limit: (identifier: string, opts?: Record<string, unknown>) => Promise<{ success: boolean; remaining: number; reset: number }> } | null = null;
let _initAttempted = false;

async function getRateLimiter() {
  if (_initAttempted) return _ratelimit;
  _initAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.info('[rate-limit] Upstash not configured — using in-memory rate limiter');
    return null;
  }

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    _ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
      prefix: 'tsrating:ratelimit',
    });
    return _ratelimit;
  } catch {
    console.warn('[rate-limit] @upstash/ratelimit not installed — using in-memory fallback');
    return null;
  }
}

/**
 * Check rate limit for a given identifier (IP + pathname).
 * Uses Upstash Redis if configured, otherwise in-memory sliding window.
 */
export async function checkRateLimit(
  identifier: string,
  pathname: string
): Promise<RateLimitResult> {
  const [maxRequests, windowSec] = getLimitForPath(pathname);
  const limiter = await getRateLimiter();

  // Fallback: in-memory rate limiting
  if (!limiter) {
    return checkMemoryRateLimit(`${identifier}:${pathname}`, maxRequests, windowSec);
  }

  try {
    const { success, remaining, reset } = await limiter.limit(
      `${identifier}:${pathname}`,
      { rate: maxRequests, duration: `${windowSec} s` }
    );

    return {
      allowed: success,
      remaining,
      resetAt: reset,
    };
  } catch (error) {
    // If Redis is down, fall back to in-memory
    console.error('[rate-limit] Redis error, falling back to in-memory:', error);
    return checkMemoryRateLimit(`${identifier}:${pathname}`, maxRequests, windowSec);
  }
}
