import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock rate-limit module
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
}));

// Mock supabase-middleware module
// Note: NextResponse.next({ request }) requires a real Headers instance inside
// the Next.js edge runtime. In jsdom/node tests we avoid that by returning
// a plain NextResponse whose headers we can inspect.
vi.mock('@/lib/supabase-middleware', () => ({
  createMiddlewareSupabaseClient: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return {
      supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
      response: NextResponse.next(),
    };
  }),
}));

// Need to mock crypto.randomUUID for consistent nonce
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => '12345678-1234-1234-1234-123456789abc',
});

import { middleware } from '@/middleware';
import { checkRateLimit } from '@/lib/rate-limit';

function createMockRequest(pathname: string, options: { ip?: string; headers?: Record<string, string> } = {}): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000');
  const req = new NextRequest(url, {
    headers: options.headers ? new Headers(options.headers) : undefined,
  });
  if (options.ip) {
    Object.defineProperty(req, 'ip', { value: options.ip });
  }
  return req;
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true, remaining: 99, resetAt: Date.now() + 60000,
    });
  });

  // =============================================
  // STATIC ASSET SKIPPING
  // =============================================
  describe('static asset skipping', () => {
    it('should skip /_next paths', async () => {
      const req = createMockRequest('/_next/static/chunks/main.js');
      const res = await middleware(req);
      // Should return early NextResponse.next() without CSP headers
      expect(res.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should skip /static paths', async () => {
      const req = createMockRequest('/static/image.png');
      const res = await middleware(req);
      expect(res.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should skip paths with file extensions', async () => {
      const req = createMockRequest('/logo.svg');
      const res = await middleware(req);
      expect(res.headers.get('Content-Security-Policy')).toBeNull();
    });
  });

  // =============================================
  // RATE LIMITING
  // =============================================
  describe('rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        allowed: false, remaining: 0, resetAt: Date.now() + 30000,
      });
      const req = createMockRequest('/login');
      const res = await middleware(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('should include error message in 429 response body', async () => {
      (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        allowed: false, remaining: 0, resetAt: Date.now() + 30000,
      });
      const req = createMockRequest('/login');
      const res = await middleware(req);
      const body = await res.json();
      expect(body.error).toContain('Demasiadas solicitudes');
    });

    it('should pass IP to checkRateLimit', async () => {
      const req = createMockRequest('/foros', { ip: '1.2.3.4' });
      await middleware(req);
      expect(checkRateLimit).toHaveBeenCalledWith('1.2.3.4', '/foros');
    });

    it('should fallback to x-forwarded-for if no IP', async () => {
      const req = createMockRequest('/foros', { headers: { 'x-forwarded-for': '5.6.7.8' } });
      await middleware(req);
      expect(checkRateLimit).toHaveBeenCalledWith('5.6.7.8', '/foros');
    });

    it('should use "unknown" if no IP info available', async () => {
      const req = createMockRequest('/foros');
      await middleware(req);
      expect(checkRateLimit).toHaveBeenCalledWith('unknown', '/foros');
    });
  });

  // =============================================
  // SECURITY HEADERS
  // =============================================
  describe('security headers', () => {
    it('should set Content-Security-Policy with nonce', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('nonce-');
      expect(csp).toContain("object-src 'none'");
    });

    it('should set x-nonce header', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      expect(res.headers.get('x-nonce')).toBeTruthy();
    });

    it('should NOT set X-Content-Type-Options (handled by next.config.js)', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      expect(res.headers.get('X-Content-Type-Options')).toBeNull();
    });

    it('should NOT set X-Frame-Options for normal pages (handled by next.config.js)', async () => {
      const req = createMockRequest('/foros');
      const res = await middleware(req);
      expect(res.headers.get('X-Frame-Options')).toBeNull();
    });

    it('should NOT set X-XSS-Protection (handled by next.config.js)', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      expect(res.headers.get('X-XSS-Protection')).toBeNull();
    });
  });

  // =============================================
  // ADMIN/SENSITIVE PAGES — STRICTER HEADERS
  // =============================================
  describe('sensitive page protection', () => {
    it('should set X-Frame-Options to DENY for /admin paths', async () => {
      const req = createMockRequest('/admin/dashboard');
      const res = await middleware(req);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should set X-Frame-Options to DENY for /mi-cuenta paths', async () => {
      const req = createMockRequest('/mi-cuenta/settings');
      const res = await middleware(req);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  // =============================================
  // CSP DIRECTIVES VALIDATION
  // =============================================
  describe('CSP directives', () => {
    it('should block object embeds', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy') || '';
      expect(csp).toContain("object-src 'none'");
    });

    it('should restrict form-action to self', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy') || '';
      expect(csp).toContain("form-action 'self'");
    });

    it('should restrict base-uri to self', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy') || '';
      expect(csp).toContain("base-uri 'self'");
    });

    it('should allow Supabase connections', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy') || '';
      expect(csp).toContain('https://*.supabase.co');
      expect(csp).toContain('wss://*.supabase.co');
    });

    it('should include strict-dynamic for scripts', async () => {
      const req = createMockRequest('/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy') || '';
      expect(csp).toContain("'strict-dynamic'");
    });
  });
});
