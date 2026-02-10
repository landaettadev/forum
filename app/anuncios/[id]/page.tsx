import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AdDetailContent } from '@/components/ads/ad-detail-content';
import { BannerSlot } from '@/components/ads/banner-slot';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export default async function AdDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: ad, error } = await supabase
    .from('escort_ads')
    .select(`
      *,
      author:profiles!user_id (
        id,
        username,
        avatar_url,
        is_verified,
        is_vip,
        created_at
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
        is_verified,
        display_order
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !ad) {
    notFound();
  }

  // Increment views (fire and forget)
  supabase.rpc('increment_ad_views', { p_ad_id: params.id }).then(() => {});

  // Get related ads from same country/region
  const { data: relatedAds } = await supabase
    .from('escort_ads')
    .select(`
      id,
      title,
      city,
      age,
      rates,
      currency,
      photos:escort_ad_photos (
        url,
        thumbnail_url,
        is_primary
      )
    `)
    .eq('status', 'active')
    .eq('country_id', ad.country_id)
    .neq('id', ad.id)
    .limit(4);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex justify-center py-3 bg-[hsl(var(--forum-surface-alt))]">
        <BannerSlot position="header" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <AdDetailContent ad={ad} relatedAds={relatedAds || []} />
      </div>

      <Footer />
    </div>
  );
}
