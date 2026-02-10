import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BannerPurchaseFlow } from '@/components/ads/banner-purchase-flow';

export const metadata = {
  title: 'Publicidad — TransForo',
  description: 'Compra espacios publicitarios en TransForo',
};

export default async function PublicidadPage() {
  const supabase = createServerSupabaseClient();

  // Get countries that have ad zones
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, slug, flag_emoji')
    .order('name');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <BannerPurchaseFlow countries={countries || []} />
      </div>

      <Footer />
    </div>
  );
}
