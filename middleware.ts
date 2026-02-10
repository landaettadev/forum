import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-middleware';

// Rate limiting store (en producción usar Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Configuración de rate limiting por ruta
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  '/api/': { requests: 60, windowMs: 60000 }, // 60 req/min para APIs
  '/login': { requests: 5, windowMs: 60000 }, // 5 intentos/min para login
  '/registro': { requests: 3, windowMs: 300000 }, // 3 registros/5min
  '/nuevo-hilo': { requests: 10, windowMs: 60000 }, // 10 hilos/min
  'default': { requests: 100, windowMs: 60000 }, // 100 req/min general
};

function getRateLimitConfig(pathname: string) {
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || record.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

// Limpiar rate limit store periódicamente
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(rateLimitMap.entries());
    entries.forEach(([key, record]) => {
      if (record.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    });
  }, 60000);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware para assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // archivos con extensión
  ) {
    return NextResponse.next();
  }

  // Obtener identificador (IP o user ID si está autenticado)
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const identifier = `${ip}-${pathname}`;

  // Aplicar rate limiting
  const config = getRateLimitConfig(pathname);
  const { allowed, remaining, resetAt } = checkRateLimit(
    identifier,
    config.requests,
    config.windowMs
  );

  // Crear respuesta con Supabase SSR session refresh
  let response: NextResponse;
  if (!allowed) {
    response = NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, intenta más tarde.' },
      { status: 429 }
    );
  } else {
    const { supabase, response: supabaseResponse } = createMiddlewareSupabaseClient(request);
    // Refresh the session so Server Components can read auth state from cookies
    await supabase.auth.getUser();
    response = supabaseResponse;
  }

  // Agregar headers de rate limiting
  response.headers.set('X-RateLimit-Limit', config.requests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetAt).toISOString());

  // Security headers adicionales
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Prevenir clickjacking en páginas sensibles
  if (pathname.includes('/admin') || pathname.includes('/mi-cuenta')) {
    response.headers.set('X-Frame-Options', 'DENY');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
