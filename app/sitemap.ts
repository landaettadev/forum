import type { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsrating.com';
const THREADS_PER_SITEMAP = 5000;

// Sitemap index — splits into multiple sitemaps for scalability
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabaseClient();

  // --- Static pages ---
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/foros`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/buscar`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/reglas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/galeria`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/reputacion`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/anuncios`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/publicidad`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contacto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/registro`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terminos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // --- Countries ---
  const { data: countries } = await supabase
    .from('countries')
    .select('slug')
    .order('display_order');

  const countryPages: MetadataRoute.Sitemap = (countries || []).map((c) => ({
    url: `${SITE_URL}/foros/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // --- Regions ---
  const { data: regions } = await supabase
    .from('regions')
    .select('slug, country:countries(slug)')
    .order('name');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionPages: MetadataRoute.Sitemap = (regions || []).map((r: any) => ({
    url: `${SITE_URL}/foros/${r.country?.slug}/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  })).filter((p) => !p.url.includes('undefined'));

  // --- Subforos ---
  const { data: forums } = await supabase
    .from('forums')
    .select('slug')
    .order('display_order');

  const forumPages: MetadataRoute.Sitemap = (forums || []).map((f) => ({
    url: `${SITE_URL}/foro/${f.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // --- Threads (paginated for scale) ---
  const { count: threadCount } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true });

  const totalThreads = threadCount || 0;
  const limit = Math.min(totalThreads, THREADS_PER_SITEMAP);

  const { data: threads } = await supabase
    .from('threads')
    .select('id, slug, last_post_at, created_at, region:regions(slug, country:countries(slug))')
    .order('last_post_at', { ascending: false })
    .limit(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threadPages: MetadataRoute.Sitemap = (threads || []).map((t: any) => {
    const countrySlug = t.region?.country?.slug;
    const regionSlug = t.region?.slug;
    const url = (t.slug && countrySlug && regionSlug)
      ? `${SITE_URL}/foros/${countrySlug}/${regionSlug}/${t.slug}`
      : `${SITE_URL}/hilo/${t.id}`;
    return {
      url,
      lastModified: new Date(t.last_post_at || t.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    };
  });

  // --- User profiles (active) ---
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .gt('posts_count', 0)
    .order('posts_count', { ascending: false })
    .limit(1000);

  const profilePages: MetadataRoute.Sitemap = (profiles || []).map((p) => ({
    url: `${SITE_URL}/user/${p.username}`,
    lastModified: new Date(p.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...countryPages,
    ...regionPages,
    ...forumPages,
    ...threadPages,
    ...profilePages,
  ];
}
