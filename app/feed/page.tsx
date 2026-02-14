import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { generateMetadata as genMeta } from '@/lib/metadata';
import Link from 'next/link';
import { MessageSquare, Eye, TrendingUp, Clock, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export const metadata = genMeta({
  title: 'Feed — Novedades',
  description: 'Las últimas discusiones, hilos populares y tendencias en TS Rating.',
  url: '/feed',
  noIndex: true,
});

export default async function FeedPage() {
  const supabase = createServerSupabaseClient();

  // Trending threads (most replies in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: trending } = await supabase
    .from('threads')
    .select('id, title, replies_count, views_count, last_post_at, created_at, author:profiles!threads_author_id_fkey(username, avatar_url), region:regions(name, country:countries(name_es, flag_emoji))')
    .gte('last_post_at', sevenDaysAgo)
    .order('replies_count', { ascending: false })
    .limit(10);

  // Recent threads
  const { data: recent } = await supabase
    .from('threads')
    .select('id, title, replies_count, views_count, last_post_at, created_at, author:profiles!threads_author_id_fkey(username, avatar_url), region:regions(name, country:countries(name_es, flag_emoji))')
    .order('created_at', { ascending: false })
    .limit(15);

  // Hot threads (most views in last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: hot } = await supabase
    .from('threads')
    .select('id, title, replies_count, views_count, last_post_at, created_at, author:profiles!threads_author_id_fkey(username, avatar_url), region:regions(name, country:countries(name_es, flag_emoji))')
    .gte('last_post_at', oneDayAgo)
    .order('views_count', { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <h1 className="text-2xl font-bold mb-6 forum-text">Feed — Novedades</h1>

        <div className="flex gap-6">
          <main className="flex-1 space-y-8">
            {/* Hot Now */}
            <FeedSection
              icon={<Flame className="h-5 w-5 text-orange-500" />}
              title="En llamas ahora"
              threads={hot || []}
              emptyMessage="No hay hilos calientes ahora"
            />

            {/* Trending */}
            <FeedSection
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              title="Tendencias de la semana"
              threads={trending || []}
              emptyMessage="No hay tendencias esta semana"
            />

            {/* Recent */}
            <FeedSection
              icon={<Clock className="h-5 w-5 text-blue-500" />}
              title="Más recientes"
              threads={recent || []}
              emptyMessage="No hay hilos recientes"
            />
          </main>

          <div className="hidden lg:block w-80">
            <Sidebar />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function FeedSection({
  icon,
  title,
  threads,
  emptyMessage,
}: {
  icon: React.ReactNode;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  threads: any[];
  emptyMessage: string;
}) {
  if (!threads.length) {
    return (
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-3 forum-text">
          {icon} {title}
        </h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-3 forum-text">
        {icon} {title}
      </h2>
      <div className="space-y-2">
        {threads.map((thread) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const region = thread.region as any;
          const location = region?.name
            ? `${region.country?.flag_emoji || ''} ${region.name}`.trim()
            : null;

          return (
            <Link
              key={thread.id}
              href={`/hilo/${thread.id}`}
              className="block forum-surface rounded-lg p-3 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium group-hover:text-[hsl(var(--forum-accent))] transition-colors line-clamp-1">
                    {thread.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>por @{thread.author?.username}</span>
                    {location && <span>{location}</span>}
                    <span>{formatDistanceToNow(new Date(thread.last_post_at || thread.created_at), { addSuffix: true, locale: es })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {thread.replies_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {thread.views_count || 0}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
