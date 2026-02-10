import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CreateAdForm } from '@/components/ads/create-ad-form';

export default async function NuevoAnuncioPage() {
  const supabase = createServerSupabaseClient();
  // Get countries for selection
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, slug, flag_emoji')
    .order('name');

  // Get services
  const { data: services } = await supabase
    .from('escort_services')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <CreateAdForm countries={countries || []} services={services || []} />
      </div>

      <Footer />
    </div>
  );
}
