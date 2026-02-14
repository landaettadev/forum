const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResult {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Verify a Turnstile CAPTCHA token server-side.
 * Returns true if the token is valid, or if Turnstile is not configured (dev mode).
 */
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  // Skip verification if Turnstile is not configured (dev/test)
  if (!TURNSTILE_SECRET_KEY) return true;

  if (!token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    const result: TurnstileVerifyResult = await response.json();
    return result.success;
  } catch {
    // If verification service is down, allow the request (fail-open)
    // This prevents locking users out if Cloudflare has issues
    console.error('Turnstile verification failed — allowing request (fail-open)');
    return true;
  }
}
