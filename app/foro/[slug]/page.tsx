import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ThreadRow } from '@/components/forum/thread-row';
import { Pagination } from '@/components/forum/pagination';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/layout/footer';

export const revalidate = 30;

const THREADS_PER_PAGE = 25;

type PageProps = {
  params: { slug: string };
  searchParams: { page?: string };
};

export default async function ForumPage({ params, searchParams }: PageProps) {
  const supabase = createServerSupabaseClient();
  const t = await getTranslations('forum');
  const page = Number(searchParams.page) || 1;

  const { data: forum } = await supabase
    .from('forums')
    .select('*, category:categories(*)')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!forum) {
    notFound();
  }

  const from = (page - 1) * THREADS_PER_PAGE;
  const to = from + THREADS_PER_PAGE - 1;

  const { data: threads, count } = await supabase
    .from('threads')
    .select('*, author:profiles!threads_author_id_fkey(*)', { count: 'exact' })
    .eq('forum_id', forum.id)
    .order('is_pinned', { ascending: false })
    .order('last_post_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / THREADS_PER_PAGE);

  const breadcrumbItems = [
    { label: forum.category?.name || t('title'), href: '/' },
    { label: forum.name },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex gap-6">
          <main className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">{forum.name}</h1>
                {forum.description && (
                  <p className="forum-text-secondary text-sm">{forum.description}</p>
                )}
              </div>

              <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]">
                <Link href={`/nuevo-hilo?foro=${forum.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newThread')}
                </Link>
              </Button>
            </div>

            <div className="forum-surface">
              {threads && threads.length > 0 ? (
                <>
                  <div className="divide-y divide-[hsl(var(--forum-border))]">
                    {threads.map((thread) => (
                      <ThreadRow key={thread.id} thread={thread} />
                    ))}
                  </div>

                  <Pagination currentPage={page} totalPages={totalPages} />
                </>
              ) : (
                <div className="p-8 text-center forum-text-muted">
                  <p>{t('noThreadsYet')}</p>
                  <p className="text-sm mt-2">{t('beFirst')}</p>
                </div>
              )}
            </div>
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
