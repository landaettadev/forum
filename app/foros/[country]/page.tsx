import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { CountryPageContent } from '@/components/forum/country-page-content';
import { BannerSlot } from '@/components/ads/banner-slot';
import { notFound } from 'next/navigation';
import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';
import { breadcrumbJsonLd } from '@/lib/jsonld';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { country: string } }): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data: country } = await supabase
    .from('countries')
    .select('name, name_es, flag_emoji')
    .eq('slug', params.country)
    .maybeSingle();

  if (!country) return { title: 'Country not found' };

  const name = `${country.flag_emoji || ''} ${country.name_es || country.name}`.trim();
  return genMeta({
    title: `Escorts Trans ${country.name_es || country.name} — Reseñas y Opiniones`,
    description: `Foro de escorts trans y travestis en ${name}. Reseñas, opiniones, fotos verificadas y experiencias reales de catadores en ${SITE_NAME}.`,
    url: `/foros/${params.country}`,
  });
}

interface PageProps {
  params: { country: string };
}

export default async function CountryForumPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();
  const { data: country } = await supabase
    .from('countries')
    .select('*, continents(*)')
    .eq('slug', params.country)
    .single();

  if (!country) {
    notFound();
  }

  const { data: regions } = await supabase
    .from('regions')
    .select('*')
    .eq('country_id', country.id)
    .order('display_order');

  // Fetch thread counts per region
  const regionIds = (regions || []).map(r => r.id);
  const regionStats: Record<string, { threads_count: number; posts_count: number }> = {};

  if (regionIds.length > 0) {
    const { data: threadCounts } = await supabase
      .from('threads')
      .select('region_id, replies_count')
      .in('region_id', regionIds);

    if (threadCounts) {
      for (const t of threadCounts) {
        if (!t.region_id) continue;
        if (!regionStats[t.region_id]) {
          regionStats[t.region_id] = { threads_count: 0, posts_count: 0 };
        }
        regionStats[t.region_id].threads_count += 1;
        // posts = 1 (first post) + replies
        regionStats[t.region_id].posts_count += 1 + (t.replies_count || 0);
      }
    }
  }

  // Fetch last thread per region
  const lastThreadsByRegion: Record<string, { id: string; title: string; last_post_at: string; author: { username: string; avatar_url: string | null } }> = {};

  if (regionIds.length > 0) {
    const { data: lastThreads } = await supabase
      .from('threads')
      .select('id, title, last_post_at, created_at, region_id, author:profiles!threads_author_id_fkey(username, avatar_url)')
      .in('region_id', regionIds)
      .order('last_post_at', { ascending: false });

    if (lastThreads) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const thread of lastThreads as any[]) {
        if (thread.region_id && !lastThreadsByRegion[thread.region_id]) {
          lastThreadsByRegion[thread.region_id] = {
            id: thread.id,
            title: thread.title,
            last_post_at: thread.last_post_at || thread.created_at,
            author: thread.author,
          };
        }
      }
    }
  }

  const { data: forums } = await supabase
    .from('forums')
    .select('*')
    .eq('country_code', country.iso_code)
    .order('display_order');

  const countryDisplayName = `${country.flag_emoji || ''} ${country.name_es || country.name}`.trim();

  const bcJsonLd = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Forums', url: '/foros' },
    { name: countryDisplayName, url: `/foros/${params.country}` },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
      />
      <Header />

      <div className="flex justify-center py-3 bg-[hsl(var(--forum-surface-alt))]">
        <BannerSlot position="header" zoneType="home_country" countryId={country.id} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* SEO descriptive text to avoid thin content */}
        <p className="text-sm text-muted-foreground mb-4">
          {`Foro de escorts trans y travestis en ${countryDisplayName}. Reseñas verificadas, opiniones de catadores y experiencias reales actualizadas ${new Date().getFullYear()}. Comunidad ${SITE_NAME}.`}
        </p>
        <div className="flex gap-6">
          <CountryPageContent 
            country={country} 
            regions={regions} 
            forums={forums}
            regionStats={regionStats}
            lastThreadsByRegion={lastThreadsByRegion}
          />

          <div className="hidden lg:block w-80">
            <div className="space-y-4">
              <BannerSlot position="sidebar" zoneType="home_country" countryId={country.id} />
              <Sidebar countrySlug={params.country} countryName={country.name} />
              <BannerSlot position="sidebar_bottom" zoneType="home_country" countryId={country.id} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
