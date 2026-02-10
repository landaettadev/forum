import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ZoneAlertsConfig } from '@/components/ads/zone-alerts-config';

export default async function AlertasPage() {
  const supabase = createServerSupabaseClient();
  // Get countries for selection
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, slug, flag_emoji')
    .order('name');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <ZoneAlertsConfig countries={countries || []} />
      </div>

      <Footer />
    </div>
  );
}
