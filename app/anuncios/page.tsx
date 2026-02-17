import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { AdsListContent } from '@/components/ads/ads-list-content';
import { BannerSlot } from '@/components/ads/banner-slot';

export const revalidate = 60;

export default async function AnunciosPage({
  searchParams,
}: {
  searchParams: { country?: string; region?: string; page?: string };
}) {
  const supabase = createServerSupabaseClient();
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  // Build query
  let query = supabase
    .from('escort_ads')
    .select(`
      *,
      author:profiles!user_id (
        id,
        username,
        avatar_url,
        is_verified,
        is_vip
      ),
      country:countries (
        id,
        name,
        slug,
        flag_emoji
      ),
      region:regions (
        id,
        name,
        slug
      ),
      photos:escort_ad_photos (
        id,
        url,
        thumbnail_url,
        is_primary,
        display_order
      )
    `, { count: 'exact' })
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (searchParams.country) {
    const { data: countryData } = await supabase
      .from('countries')
      .select('id')
      .eq('slug', searchParams.country)
      .single();
    
    if (countryData) {
      query = query.eq('country_id', countryData.id);
    }
  }

  if (searchParams.region) {
    const { data: regionData } = await supabase
      .from('regions')
      .select('id')
      .eq('slug', searchParams.region)
      .single();
    
    if (regionData) {
      query = query.eq('region_id', regionData.id);
    }
  }

  const { data: ads, count } = await query;

  // Get countries for filter
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, slug, flag_emoji')
    .order('name');

  // Get regions if country selected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let regions: any[] = [];
  if (searchParams.country) {
    const { data: countryData } = await supabase
      .from('countries')
      .select('id')
      .eq('slug', searchParams.country)
      .single();
    
    if (countryData) {
      const { data: regionsData } = await supabase
        .from('regions')
        .select('id, name, slug')
        .eq('country_id', countryData.id)
        .order('name');
      regions = regionsData || [];
    }
  }

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex justify-center py-3 bg-[hsl(var(--forum-surface-alt))]">
        <BannerSlot position="header" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex gap-8">
          <main className="flex-1">
            <AdsListContent
              ads={ads || []}
              countries={countries || []}
              regions={regions}
              currentCountry={searchParams.country}
              currentRegion={searchParams.region}
              currentPage={page}
              totalPages={totalPages}
              totalAds={count || 0}
            />
          </main>

          <div className="hidden lg:block w-80">
            <div className="space-y-4">
              <BannerSlot position="sidebar_top" />
              <Sidebar />
              <BannerSlot position="sidebar_bottom" />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
