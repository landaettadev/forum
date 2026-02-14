import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MessageSquare, Eye } from 'lucide-react';
import { threadUrl } from '@/lib/slug';

interface RelatedThreadsProps {
  threadId: string;
  regionId?: string;
  forumId?: string;
  regionName?: string;
}

export async function RelatedThreads({ threadId, regionId, forumId, regionName }: RelatedThreadsProps) {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('threads')
    .select('id, title, slug, replies_count, views_count, last_post_at, region:regions(slug, country:countries(slug))')
    .neq('id', threadId)
    .order('last_post_at', { ascending: false })
    .limit(5);

  if (regionId) {
    query = query.eq('region_id', regionId);
  } else if (forumId) {
    query = query.eq('forum_id', forumId);
  }

  const { data: threads } = await query;

  if (!threads || threads.length === 0) return null;

  const heading = regionName
    ? `Related discussions in ${regionName}`
    : 'Related discussions';

  return (
    <div className="forum-surface rounded-lg p-4 mt-6">
      <h3 className="font-semibold text-sm mb-3 forum-text">{heading}</h3>
      <ul className="space-y-2">
        {threads.map((t) => (
          <li key={t.id}>
            <Link
              href={threadUrl({ id: t.id, slug: t.slug, region: t.region as any })}
              className="block group hover:bg-[hsl(var(--forum-surface-alt))] rounded p-2 -mx-2 transition-colors"
            >
              <span className="text-sm font-medium group-hover:text-[hsl(var(--forum-accent))] transition-colors line-clamp-1">
                {t.title}
              </span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {t.replies_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {t.views_count || 0}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
