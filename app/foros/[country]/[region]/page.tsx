import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { RegionPageContent } from '@/components/forum/region-page-content';
import { BannerSlot } from '@/components/ads/banner-slot';
import { notFound } from 'next/navigation';

export const revalidate = 60;

interface PageProps {
  params: { country: string; region: string };
}

export default async function RegionForumPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();
  const { data: country } = await supabase
    .from('countries')
    .select('*')
    .eq('slug', params.country)
    .single();

  if (!country) {
    notFound();
  }

  const { data: region } = await supabase
    .from('regions')
    .select('*')
    .eq('country_id', country.id)
    .eq('slug', params.region)
    .single();

  if (!region) {
    notFound();
  }

  // Fetch forums for this country to auto-select when creating threads
  const { data: forums } = await supabase
    .from('forums')
    .select('id')
    .eq('country_code', country.iso_code)
    .order('display_order')
    .limit(1);

  const forumId = forums?.[0]?.id || '';

  const { data: threads } = await supabase
    .from('threads')
    .select(`
      *,
      author:profiles!threads_author_id_fkey(id, username, avatar_url, role, is_verified, is_vip, is_escort, escort_verified_at, moderator_type, likes_received, dislikes_received, posts_count, threads_count, thanks_received, created_at),
      last_post_author:profiles!threads_last_post_author_id_fkey(id, username, avatar_url),
      forum:forums(id, name, slug)
    `)
    .eq('region_id', region.id)
    .order('is_pinned', { ascending: false })
    .order('last_post_at', { ascending: false })
    .limit(20);

  // Compute region stats
  const threadsCount = threads?.length || 0;
  const postsCount = threads?.reduce((sum, t) => sum + 1 + (t.replies_count || 0), 0) || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex justify-center py-3 bg-[hsl(var(--forum-surface-alt))]">
        <BannerSlot position="header" zoneType="city" countryId={country.id} regionId={region.id} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex gap-6">
          <RegionPageContent 
            country={country} 
            region={region} 
            threads={threads}
            forumId={forumId}
            threadsCount={threadsCount}
            postsCount={postsCount}
          />

          <div className="hidden lg:block w-80">
            <div className="space-y-4">
              <BannerSlot position="sidebar" zoneType="city" countryId={country.id} regionId={region.id} />
              <Sidebar countrySlug={params.country} countryName={country.name} />
              <BannerSlot position="sidebar_bottom" zoneType="city" countryId={country.id} regionId={region.id} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
