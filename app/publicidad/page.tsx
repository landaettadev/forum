import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BannerPurchaseFlow } from '@/components/ads/banner-purchase-flow';

import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Advertising',
  description: 'Buy banner ad spaces on TS Rating. Reach the trans community with targeted advertising by country and region.',
  url: '/publicidad',
});

export default async function PublicidadPage() {
  const supabase = createServerSupabaseClient();

  // Get countries with their regions
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, slug, flag_emoji')
    .order('name');

  const { data: regions } = await supabase
    .from('regions')
    .select('id, name, slug, country_id')
    .order('name');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <BannerPurchaseFlow countries={countries || []} regions={regions || []} />
      </div>

      <Footer />
    </div>
  );
}
