import { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://transforo.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabaseClient();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/foros`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/buscar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/reglas`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/galeria`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/reputacion`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/anuncios`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/publicidad`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/registro`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terminos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Countries
  const { data: countries } = await supabase
    .from('countries')
    .select('slug')
    .order('display_order');

  const countryPages: MetadataRoute.Sitemap = (countries || []).map((country) => ({
    url: `${SITE_URL}/foros/${country.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Regions (country + region)
  const { data: regions } = await supabase
    .from('regions')
    .select('slug, country:countries(slug)')
    .order('name');

  const regionPages: MetadataRoute.Sitemap = (regions || []).map((region: any) => ({
    url: `${SITE_URL}/foros/${region.country?.slug}/${region.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  })).filter((p) => !p.url.includes('undefined'));

  // Subforos
  const { data: forums } = await supabase
    .from('forums')
    .select('slug')
    .order('display_order');

  const forumPages: MetadataRoute.Sitemap = (forums || []).map((forum) => ({
    url: `${SITE_URL}/foro/${forum.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Threads (latest 2000)
  const { data: threads } = await supabase
    .from('threads')
    .select('id, last_post_at, created_at')
    .order('last_post_at', { ascending: false })
    .limit(2000);

  const threadPages: MetadataRoute.Sitemap = (threads || []).map((thread) => ({
    url: `${SITE_URL}/hilo/${thread.id}`,
    lastModified: new Date(thread.last_post_at || thread.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // User profiles (active users)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .gt('posts_count', 0)
    .order('posts_count', { ascending: false })
    .limit(500);

  const profilePages: MetadataRoute.Sitemap = (profiles || []).map((profile) => ({
    url: `${SITE_URL}/usuaria/${profile.username}`,
    lastModified: new Date(profile.updated_at || new Date()),
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
