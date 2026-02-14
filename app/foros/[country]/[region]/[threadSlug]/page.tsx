import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Pagination } from '@/components/forum/pagination';
import { ThreadHeader } from '@/components/forum/thread-header';
import { ThreadContent } from '@/components/forum/thread-content';
import { PollDisplay } from '@/components/forum/poll-display';
import { RelatedThreads } from '@/components/forum/related-threads';
import { Footer } from '@/components/layout/footer';
import { getTranslations } from 'next-intl/server';
import { generateThreadMetadata } from '@/lib/metadata';
import { SITE_URL } from '@/lib/metadata';
import { discussionForumPostingJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

export const revalidate = 30;

type PageParams = {
  params: { country: string; region: string; threadSlug: string };
  searchParams: { page?: string };
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data: thread } = await supabase
    .from('threads')
    .select('id, title, slug, tag, views_count, replies_count, created_at, author:profiles!threads_author_id_fkey(username), region:regions(name, slug, country:countries(name, name_es, slug, flag_emoji))')
    .eq('slug', params.threadSlug)
    .maybeSingle();

  if (!thread) return { title: 'Thread not found' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const region = thread.region as any;
  const countrySlug = region?.country?.slug;
  const regionSlug = region?.slug;
  const canonicalUrl = countrySlug && regionSlug
    ? `/foros/${countrySlug}/${regionSlug}/${thread.slug}`
    : `/hilo/${thread.id}`;

  const meta = generateThreadMetadata({
    id: thread.id,
    title: thread.title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    author: thread.author as any,
    created_at: thread.created_at,
    views_count: thread.views_count,
    replies_count: thread.replies_count,
    region_name: region?.name,
    country_name: region?.country?.name_es || region?.country?.name,
    tag: thread.tag,
    slug: thread.slug,
    canonicalUrl,
  });

  return meta;
}

const POSTS_PER_PAGE = 20;

export default async function ThreadSlugPage({ params, searchParams }: PageParams) {
  const supabase = createServerSupabaseClient();
  const t = await getTranslations('forum');
  const page = Number(searchParams.page) || 1;

  // Find thread by slug
  const { data: thread } = await supabase
    .from('threads')
    .select('*, author:profiles!threads_author_id_fkey(*), forum:forums(*, category:categories(*)), region:regions(id, name, slug, country:countries(id, name, name_es, slug, flag_emoji, iso_code))')
    .eq('slug', params.threadSlug)
    .maybeSingle();

  if (!thread) {
    notFound();
  }

  // Verify country/region match to avoid duplicate content
  const country = thread.region?.country;
  const region = thread.region;
  if (country?.slug !== params.country || region?.slug !== params.region) {
    // Redirect to correct canonical URL
    if (country?.slug && region?.slug) {
      redirect(`/foros/${country.slug}/${region.slug}/${thread.slug}`);
    }
    notFound();
  }

  // Increment views
  supabase.rpc('increment_thread_views', { thread_id: thread.id }).then(({ error }) => {
    if (error) console.error('[ThreadSlugPage] Error incrementing views:', error.message);
  });

  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: posts, count } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*)', { count: 'exact' })
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / POSTS_PER_PAGE);

  const breadcrumbItems = [
    { label: t('title'), href: '/' },
    { label: `${country?.flag_emoji || ''} ${country?.name_es || country?.name || ''}`.trim(), href: `/foros/${country?.slug}` },
    { label: region?.name || '', href: `/foros/${country?.slug}/${region?.slug}` },
    { label: thread.title },
  ];

  const canonicalPath = `/foros/${country?.slug}/${region?.slug}/${thread.slug}`;

  const threadJsonLd = discussionForumPostingJsonLd({
    id: thread.id,
    title: thread.title,
    content: posts?.[0]?.content,
    author_username: thread.author?.username || 'User',
    created_at: thread.created_at,
    replies_count: thread.replies_count || 0,
    views_count: thread.views_count || 0,
    tag: thread.tag,
    url: `${SITE_URL}${canonicalPath}`,
  });

  const bcItems = [
    { name: 'Home', url: '/' },
    { name: country?.name_es || country?.name || '', url: `/foros/${country?.slug}` },
    { name: region?.name || '', url: `/foros/${country?.slug}/${region?.slug}` },
    { name: thread.title, url: canonicalPath },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(threadJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(bcItems)) }}
      />
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex gap-6">
          <main className="flex-1">
            <ThreadHeader
              threadId={thread.id}
              title={thread.title}
              viewsCount={thread.views_count}
              repliesCount={thread.replies_count}
              isPinned={thread.is_pinned}
              isLocked={thread.is_locked}
              isHot={thread.is_hot}
              tag={thread.tag}
              authorUsername={thread.author?.username}
              createdAt={thread.created_at}
              forumName={thread.forum?.name}
              regionName={region?.name}
              countryName={country?.name_es || country?.name}
            />

            <PollDisplay threadId={thread.id} />

            {posts && posts.length > 0 ? (
              <>
                <ThreadContent
                  posts={posts}
                  threadId={thread.id}
                  isLocked={thread.is_locked}
                  currentPage={page}
                />
                <Pagination currentPage={page} totalPages={totalPages} />
              </>
            ) : (
              <div className="forum-surface p-8 text-center forum-text-muted">
                <p>{t('noPostsInThread')}</p>
              </div>
            )}

            <RelatedThreads
              threadId={thread.id}
              regionId={region?.id}
              forumId={thread.forum?.id}
              regionName={region?.name}
            />
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
