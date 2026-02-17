import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { RegionPageContent } from '@/components/forum/region-page-content';
import { BannerSlot } from '@/components/ads/banner-slot';
import { notFound } from 'next/navigation';
import { generateMetadata as genMeta } from '@/lib/metadata';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getTranslations, getLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { country: string; region: string } }): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const t = await getTranslations('metadata');
  
  const { data: country } = await supabase
    .from('countries')
    .select('name, name_es, flag_emoji')
    .eq('slug', params.country)
    .maybeSingle();

  const { data: region } = await supabase
    .from('regions')
    .select('name')
    .eq('slug', params.region)
    .maybeSingle();

  if (!country || !region) return { title: 'Region not found' };

  const countryName = `${country.flag_emoji || ''} ${country.name_es || country.name}`.trim();
  return genMeta({
    title: t('regionMetaTitle', { region: region.name }),
    description: t('regionMetaDesc', { region: region.name, country: countryName }),
    url: `/foros/${params.country}/${params.region}`,
  });
}

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

  // Compute region stats from actual posts
  const threadsCount = threads?.length || 0;
  let postsCount = 0;
  if (threads && threads.length > 0) {
    const threadIds = threads.map(t => t.id);
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('thread_id', threadIds);
    postsCount = count || 0;
  }

  const countryDisplayName = `${country.flag_emoji || ''} ${country.name_es || country.name}`.trim();

  const bcJsonLd = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Forums', url: '/foros' },
    { name: countryDisplayName, url: `/foros/${params.country}` },
    { name: region.name, url: `/foros/${params.country}/${params.region}` },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
      />
      <Header />

      <div className="flex justify-center py-3 bg-[hsl(var(--forum-surface-alt))]">
        <BannerSlot position="header" zoneType="city" countryId={country.id} regionId={region.id} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* SEO descriptive text - rendered via RegionPageContent */}
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
            <Sidebar 
              countrySlug={params.country} 
              countryName={country.name} 
              countryId={country.id}
              regionId={region.id}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
