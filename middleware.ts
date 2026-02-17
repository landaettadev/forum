import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-middleware';
import { countryCodeToLocale } from '@/lib/geolocation';

// Rate limiting via Upstash Redis (optional — gracefully disabled if not configured)
import { checkRateLimit } from '@/lib/rate-limit';

// Supported locales
const SUPPORTED_LOCALES = ['es', 'en', 'pt', 'fr', 'de', 'it', 'nl', 'ja', 'zh', 'ru', 'ar', 'hi', 'ko', 'tr', 'pl', 'sv', 'id', 'th'];

function getLocaleFromCountry(countryCode: string | null): string {
  if (!countryCode) return 'en';
  return countryCodeToLocale[countryCode.toUpperCase()] || 'en';
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

  // Rate limiting (uses Upstash Redis if configured, otherwise no-op)
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, remaining, resetAt } = await checkRateLimit(ip, pathname);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, intenta más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Supabase SSR session refresh — keeps auth cookies in sync
  const { response } = await createMiddlewareSupabaseClient(request);

  // Auto-detect locale from IP if user hasn't set one manually
  const existingLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const hasManuallySetLocale = request.cookies.get('LOCALE_MANUAL')?.value === 'true';
  
  if (!existingLocale && !hasManuallySetLocale) {
    // Get country from various headers (Vercel, Cloudflare, etc.)
    const countryCode = 
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      null;
    
    if (countryCode) {
      const detectedLocale = getLocaleFromCountry(countryCode);
      
      // Only set if it's a supported locale
      if (SUPPORTED_LOCALES.includes(detectedLocale)) {
        response.cookies.set('NEXT_LOCALE', detectedLocale, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
          sameSite: 'lax',
        });
      }
    }
  }

  // Generate CSP nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // In dev: allow unsafe-eval (needed for Next.js HMR / React Refresh) and unsafe-inline
  // In prod: strict nonce-based CSP
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com`;

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://flagcdn.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://ipapi.co https://challenges.cloudflare.com https://www.google.com",
    "frame-src 'self' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Pass nonce to Next.js via request header so it can apply it to inline scripts
  response.headers.set('x-nonce', nonce);

  // Override X-Frame-Options to DENY on sensitive pages (base SAMEORIGIN is set in next.config.js)
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
