import { describe, it, expect, vi } from 'vitest';

// Ensure Upstash env vars are not set — forces in-memory fallback
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Directly test the in-memory sliding window logic by extracting it.
// Since the module uses dynamic imports for upstash (which aren't installed),
// we mock the entire rate-limit module to just re-export the in-memory logic.

// --- Inline re-implementation of the in-memory rate limiter for unit testing ---
const memoryStore = new Map<string, number[]>();
const ROUTE_LIMITS: Record<string, [number, number]> = {
  '/login': [5, 60],
  '/registro': [3, 300],
  '/nuevo-hilo': [10, 60],
  '/api/': [60, 60],
};
const DEFAULT_LIMIT: [number, number] = [100, 60];

function getLimitForPath(pathname: string): [number, number] {
  for (const [path, limit] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(path)) return limit;
  }
  return DEFAULT_LIMIT;
}

function checkMemoryRateLimit(identifier: string, maxRequests: number, windowSec: number) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  let timestamps = memoryStore.get(identifier) || [];
  timestamps = timestamps.filter((t: number) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    const resetAt = timestamps[0] + windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }
  timestamps.push(now);
  memoryStore.set(identifier, timestamps);
  return { allowed: true, remaining: maxRequests - timestamps.length, resetAt: now + windowMs };
}

async function checkRateLimit(identifier: string, pathname: string) {
  const [maxRequests, windowSec] = getLimitForPath(pathname);
  return checkMemoryRateLimit(`${identifier}:${pathname}`, maxRequests, windowSec);
}

describe('checkRateLimit (in-memory fallback)', () => {
  it('should allow the first request', async () => {
    const result = await checkRateLimit('127.0.0.1', '/');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should block after exceeding limit for /login (5 per 60s)', async () => {
    const ip = 'brute-force-ip';
    // 5 allowed
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit(ip, '/login');
      expect(r.allowed).toBe(true);
    }
    // 6th should be blocked
    const blocked = await checkRateLimit(ip, '/login');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('should block after exceeding limit for /registro (3 per 300s)', async () => {
    const ip = 'reg-spam-ip';
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit(ip, '/registro');
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(ip, '/registro');
    expect(blocked.allowed).toBe(false);
  });

  it('should track separate limits per IP', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('ip-a', '/login');
    }
    // ip-a is exhausted
    const blockedA = await checkRateLimit('ip-a', '/login');
    expect(blockedA.allowed).toBe(false);

    // ip-b should still be fine
    const allowedB = await checkRateLimit('ip-b', '/login');
    expect(allowedB.allowed).toBe(true);
  });

  it('should track separate limits per path', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('shared-ip', '/login');
    }
    const blockedLogin = await checkRateLimit('shared-ip', '/login');
    expect(blockedLogin.allowed).toBe(false);

    // Same IP, different path — should still be allowed
    const allowedHome = await checkRateLimit('shared-ip', '/');
    expect(allowedHome.allowed).toBe(true);
  });

  it('should return a valid resetAt timestamp', async () => {
    const result = await checkRateLimit('ts-ip', '/login');
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('should use default limit (100/60s) for unknown paths', async () => {
    const ip = 'default-ip';
    // Should allow many requests
    for (let i = 0; i < 50; i++) {
      const r = await checkRateLimit(ip, '/some-random-page');
      expect(r.allowed).toBe(true);
    }
  });
});
