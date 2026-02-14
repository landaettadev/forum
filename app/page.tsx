import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { HomeContent } from '@/components/home/home-content';
import { BannerSlot } from '@/components/ads/banner-slot';
import { getGeoFromIP } from '@/lib/geolocation';
import { getLocale } from 'next-intl/server';
import { getLocalizedName } from '@/lib/locale-name';
import { generateMetadata as genMeta, DEFAULT_DESCRIPTION } from '@/lib/metadata';

export const metadata = genMeta({
  title: undefined,
  description: DEFAULT_DESCRIPTION,
  url: '/',
});

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const locale = await getLocale();
  // Get user's country from IP
  const geoData = await getGeoFromIP();

  // Single RPC call replaces 3 separate queries (countries + threads + lastPosts)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_homepage_data');

  // Fallback to direct query if RPC doesn't exist yet (e.g. migration not applied)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countries: any[] = rpcData || [];
  if (rpcError) {
    console.warn('get_homepage_data RPC failed, using fallback:', rpcError.message);
    const { data } = await supabase
      .from('countries')
      .select(`*, continent:continents (slug, name_es, name_en, display_order), regions (id, name, slug)`)
      .order('display_order');

    // Compute thread/post stats per country via regions using count queries (no 1000-row limit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countryList = (data || []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRegionIds = countryList.flatMap((c: any) => (c.regions || []).map((r: any) => r.id)).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const regionToCountry: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countryList.forEach((c: any) => (c.regions || []).forEach((r: any) => { if (r.id) regionToCountry[r.id] = c.id; }));

    const countryStats: Record<string, { thread_count: number; post_count: number }> = {};
    if (allRegionIds.length > 0) {
      // Fetch threads with their post counts using supabaseAdmin to bypass RLS and row limits
      const { data: threads } = await supabaseAdmin
        .from('threads')
        .select('id, region_id')
        .in('region_id', allRegionIds);
      if (threads) {
        const threadIdsByCountry: Record<string, string[]> = {};
        for (const t of threads) {
          const cId = regionToCountry[t.region_id];
          if (!cId) continue;
          if (!countryStats[cId]) countryStats[cId] = { thread_count: 0, post_count: 0 };
          countryStats[cId].thread_count += 1;
          if (!threadIdsByCountry[cId]) threadIdsByCountry[cId] = [];
          threadIdsByCountry[cId].push(t.id);
        }

        // Count posts per country using exact count queries (no row limit)
        for (const [cId, tIds] of Object.entries(threadIdsByCountry)) {
          const { count } = await supabaseAdmin
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .in('thread_id', tIds);
          countryStats[cId].post_count = count ?? 0;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countries = countryList.map((c: any) => ({
      ...c,
      thread_count: countryStats[c.id]?.thread_count || 0,
      post_count: countryStats[c.id]?.post_count || 0,
      last_post: null,
    }));
  }

  // Group countries by continent slug for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countriesByContinent = countries.reduce((acc: Record<string, { label: string; countries: any[]; displayOrder: number }>, country: any) => {
    const continentSlug = country.continent?.slug || 'otros';
    const continentLabel = country.continent ? getLocalizedName(country.continent, locale) : 'General';
    const continentDisplayOrder = country.continent?.display_order || 99;

    if (!acc[continentSlug]) {
      acc[continentSlug] = { label: continentLabel, countries: [], displayOrder: continentDisplayOrder };
    }

    acc[continentSlug].countries.push(country);
    return acc;
  }, {});

  // Fetch admin forums (Support, News, Rules) to display at bottom
  const { data: adminCategory } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', 'ts-rating-admin')
    .maybeSingle();

  let adminForums: { id: string; name: string; slug: string; description: string; forum_type: string | null; threads_count: number; posts_count: number }[] = [];
  if (adminCategory) {
    const { data: af } = await supabase
      .from('forums')
      .select('id, name, slug, description, forum_type')
      .eq('category_id', adminCategory.id)
      .order('display_order');

    if (af && af.length > 0) {
      const forumIds = af.map(f => f.id);
      const { data: forumThreads } = await supabaseAdmin
        .from('threads')
        .select('id, forum_id')
        .in('forum_id', forumIds);

      const threadsByForum: Record<string, string[]> = {};
      for (const t of forumThreads || []) {
        if (!threadsByForum[t.forum_id]) threadsByForum[t.forum_id] = [];
        threadsByForum[t.forum_id].push(t.id);
      }

      const allThreadIds = (forumThreads || []).map(t => t.id);
      const postsByThread: Record<string, number> = {};
      if (allThreadIds.length > 0) {
        const { data: forumPosts } = await supabaseAdmin
          .from('posts')
          .select('thread_id')
          .in('thread_id', allThreadIds);
        for (const p of forumPosts || []) {
          postsByThread[p.thread_id] = (postsByThread[p.thread_id] || 0) + 1;
        }
      }

      adminForums = af.map(f => ({
        ...f,
        threads_count: threadsByForum[f.id]?.length || 0,
        posts_count: (threadsByForum[f.id] || []).reduce((sum, tid) => sum + (postsByThread[tid] || 0), 0),
      }));
    }
  }

  // Fetch forum stats server-side using admin client (bypasses RLS)
  const [usersRes, threadsRes, postsRes, onlineRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('threads').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('is_online.eq.true,last_seen_at.gte.' + new Date(Date.now() - 5 * 60 * 1000).toISOString()),
  ]);
  const onlineRegistered = onlineRes.count ?? 0;
  const forumStats = {
    totalUsers: usersRes.count ?? 0,
    totalThreads: threadsRes.count ?? 0,
    totalPosts: postsRes.count ?? 0,
    onlineRegistered,
    onlineGuests: onlineRegistered > 0 ? Math.max(1, Math.floor(onlineRegistered * 2.5)) : 0,
  };

  // Find user's country by iso_code from geo detection; fallback to first country
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userCountryMatch = geoData.countryCode ? countries.find((c: any) => c.iso_code?.toUpperCase() === geoData.countryCode?.toUpperCase()) : null;
  const fallbackCountry = countries[0] || null;
  const resolvedCountry = userCountryMatch || fallbackCountry;
  const userCountrySlug = resolvedCountry?.slug || undefined;
  const geoDetected = !!userCountryMatch;
  const bannerCountryId = resolvedCountry?.id || undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex justify-center py-3 bg-[hsl(var(--forum-surface-alt))]">
        <BannerSlot position="header" zoneType="home_country" countryId={bannerCountryId} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex gap-8">
          <main className="flex-1">
            <HomeContent 
              countriesByContinent={countriesByContinent} 
              userCountrySlug={userCountrySlug}
              userCountryCode={geoData.countryCode}
              userGeoCountryName={geoData.country}
              geoDetected={geoDetected}
              adminForums={adminForums}
            />
          </main>

          <div className="hidden lg:block w-80">
            <div className="space-y-4">
              <BannerSlot position="sidebar" zoneType="home_country" countryId={bannerCountryId} />
              <Sidebar stats={forumStats} />
              <BannerSlot position="sidebar_bottom" zoneType="home_country" countryId={bannerCountryId} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
