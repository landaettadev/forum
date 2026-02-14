'use server';

import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function logLoginSession() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const cfConnectingIP = headersList.get('cf-connecting-ip');
    const userAgent = headersList.get('user-agent') || '';

    const ip = cfConnectingIP || realIP || forwardedFor?.split(',')[0]?.trim() || null;

    // Try to get geo data from headers (Vercel/Cloudflare) or ipapi
    let countryCode: string | null = null;
    let countryName: string | null = null;
    let city: string | null = null;

    const vercelCountry = headersList.get('x-vercel-ip-country');
    const vercelCity = headersList.get('x-vercel-ip-city');
    const cfCountry = headersList.get('cf-ipcountry');

    if (vercelCountry) {
      countryCode = vercelCountry;
      city = vercelCity;
    } else if (cfCountry) {
      countryCode = cfCountry;
    } else if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      try {
        const res = await fetch(`https://ipapi.co/${ip}/json/`, {
          next: { revalidate: 86400 },
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            countryCode = data.country_code || null;
            countryName = data.country_name || null;
            city = data.city || null;
          }
        }
      } catch {
        // Geo lookup failed silently
      }
    }

    await supabaseAdmin.from('login_sessions').insert({
      user_id: user.id,
      ip_address: ip,
      country_code: countryCode,
      country_name: countryName,
      city,
      user_agent: userAgent.substring(0, 500),
    });
  } catch (err) {
    console.error('[log-login] error:', err);
  }
}
