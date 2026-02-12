import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { HomeContent } from '@/components/home/home-content';
import { BannerSlot } from '@/components/ads/banner-slot';
import { getGeoFromIP, getCountrySlugFromCode } from '@/lib/geolocation';
import { getLocale } from 'next-intl/server';
import { getLocalizedName } from '@/lib/locale-name';
import { generateMetadata as genMeta, SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/metadata';

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
  const userCountrySlug = geoData.countryCode ? getCountrySlugFromCode(geoData.countryCode) : undefined;

  // First check if tables exist
  const { data: tablesCheck } = await supabase
    .from('countries')
    .select('count')
    .limit(1);

  const { data: countries, error } = await supabase
    .from('countries')
    .select(`
      *,
      continent:continents (
        slug,
        name_es,
        name_en,
        display_order
      ),
      regions (
        name,
        slug
      )
    `)
    .order('display_order');

  // Fetch threads with region info to count per country
  const { data: threadsWithRegion } = await supabase
    .from('threads')
    .select('id, region_id, replies_count, region:regions!inner(country_id)')
    .not('region_id', 'is', null);

  // Fetch last post per country (most recent thread via region)
  const { data: lastPosts } = await supabase
    .from('threads')
    .select(`
      id,
      title,
      last_post_at,
      region:regions!inner(country_id),
      last_post_author:profiles!threads_last_post_author_id_fkey(username, avatar_url),
      author:profiles!threads_author_id_fkey(username, avatar_url)
    `)
    .not('region_id', 'is', null)
    .order('last_post_at', { ascending: false });

  // Group last posts by country (take the most recent one per country)
  const lastPostByCountry: Record<string, any> = {};
  lastPosts?.forEach((thread: any) => {
    const countryId = thread.region?.country_id;
    if (countryId && !lastPostByCountry[countryId]) {
      lastPostByCountry[countryId] = {
        thread_id: thread.id,
        thread_title: thread.title,
        created_at: thread.last_post_at,
        author_username: thread.last_post_author?.username || thread.author?.username,
        author_avatar: thread.last_post_author?.avatar_url || thread.author?.avatar_url
      };
    }
  });

  // Calculate counts per country via regions
  const countsByCountry: Record<string, { threads: number; posts: number }> = {};
  
  threadsWithRegion?.forEach((thread: any) => {
    const countryId = thread.region?.country_id;
    if (!countryId) return;
    if (!countsByCountry[countryId]) {
      countsByCountry[countryId] = { threads: 0, posts: 0 };
    }
    countsByCountry[countryId].threads++;
    // posts = 1 (first post) + replies
    countsByCountry[countryId].posts += 1 + (thread.replies_count || 0);
  });

  // Group countries by continent slug for display
  const countriesByContinent = countries?.reduce((acc: Record<string, { label: string; countries: any[]; displayOrder: number }>, country: any) => {
    const continentSlug = country.continent?.slug || 'otros';
    const continentLabel = country.continent ? getLocalizedName(country.continent, locale) : 'General';
    const continentDisplayOrder = country.continent?.display_order || 99;

    if (!acc[continentSlug]) {
      acc[continentSlug] = { label: continentLabel, countries: [], displayOrder: continentDisplayOrder };
    }

    acc[continentSlug].countries.push({
      ...country,
      thread_count: countsByCountry[country.id]?.threads || 0,
      post_count: countsByCountry[country.id]?.posts || 0,
      last_post: lastPostByCountry[country.id] || null,
    });
    return acc;
  }, {}) || {};

  const continentEntries = Object.entries(countriesByContinent) as [string, { label: string; countries: any[]; displayOrder: number }][];

  const sortedEntries = continentEntries.sort((a, b) => {
    return a[1].displayOrder - b[1].displayOrder;
  });

  // Resolve user's country ID for banner ads
  const userCountry = userCountrySlug && countries
    ? countries.find((c: any) => c.slug === userCountrySlug)
    : countries?.[0];
  const bannerCountryId = userCountry?.id || undefined;

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
            />
          </main>

          <div className="hidden lg:block w-80">
            <div className="space-y-4">
              <BannerSlot position="sidebar" zoneType="home_country" countryId={bannerCountryId} />
              <Sidebar />
              <BannerSlot position="sidebar_bottom" zoneType="home_country" countryId={bannerCountryId} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
