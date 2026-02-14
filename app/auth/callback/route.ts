import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { logLoginSession } from '@/app/actions/log-login';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
    await logLoginSession().catch(() => {});
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
