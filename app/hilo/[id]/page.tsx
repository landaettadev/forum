import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Pagination } from '@/components/forum/pagination';
import { ThreadHeader } from '@/components/forum/thread-header';
import { ThreadContent } from '@/components/forum/thread-content';
import { PollDisplay } from '@/components/forum/poll-display';
import { Footer } from '@/components/layout/footer';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 20;

type PageProps = {
  params: { id: string };
  searchParams: { page?: string };
};

export default async function ThreadPage({ params, searchParams }: PageProps) {
  const supabase = createServerSupabaseClient();
  const t = await getTranslations('forum');
  const page = Number(searchParams.page) || 1;


  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('*, author:profiles!threads_author_id_fkey(*), forum:forums(*, category:categories(*)), region:regions(id, name, slug, country:countries(id, name, name_es, slug, flag_emoji, iso_code))')
    .eq('id', params.id)
    .maybeSingle();

  if (threadError) {
    console.error('[ThreadPage] Error fetching thread:', threadError.message);
  }

  if (!thread) {
    notFound();
  }

  // Increment views (fire-and-forget, don't block page render)
  supabase.rpc('increment_thread_views', { thread_id: thread.id }).then(({ error }) => {
    if (error) console.error('[ThreadPage] Error incrementing views:', error.message);
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

  const country = thread.region?.country;
  const region = thread.region;

  const breadcrumbItems = country && region
    ? [
        { label: t('title'), href: '/' },
        { label: `${country.flag_emoji || ''} ${country.name_es || country.name}`.trim(), href: `/foros/${country.slug}` },
        { label: region.name, href: `/foros/${country.slug}/${region.slug}` },
        { label: thread.title },
      ]
    : [
        { label: thread.forum?.category?.name || t('title'), href: '/' },
        { label: thread.forum?.name || t('subforum'), href: `/foro/${thread.forum?.slug}` },
        { label: thread.title },
      ];

  return (
    <div className="min-h-screen flex flex-col">
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
            />

            {/* Poll display if thread has one */}
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
