'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type ForumStatsData = {
  totalUsers: number;
  totalThreads: number;
  totalPosts: number;
  onlineRegistered: number;
  onlineGuests: number;
};

export async function getForumStats(): Promise<ForumStatsData> {
  try {
    const [usersRes, threadsRes, postsRes, onlineRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('threads').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('is_online.eq.true,last_seen_at.gte.' + new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    ]);

    if (usersRes.error) console.error('[forum-stats] profiles:', usersRes.error.message);
    if (threadsRes.error) console.error('[forum-stats] threads:', threadsRes.error.message);
    if (postsRes.error) console.error('[forum-stats] posts:', postsRes.error.message);
    if (onlineRes.error) console.error('[forum-stats] online:', onlineRes.error.message);

    const onlineRegistered = onlineRes.count ?? 0;
    // Estimate guests as ~2-3x online registered (minimum 1 if any registered are online)
    const onlineGuests = onlineRegistered > 0 ? Math.max(1, Math.floor(onlineRegistered * 2.5)) : 0;

    return {
      totalUsers: usersRes.count ?? 0,
      totalThreads: threadsRes.count ?? 0,
      totalPosts: postsRes.count ?? 0,
      onlineRegistered,
      onlineGuests,
    };
  } catch (err) {
    console.error('[forum-stats] error:', err);
    return {
      totalUsers: 0,
      totalThreads: 0,
      totalPosts: 0,
      onlineRegistered: 0,
      onlineGuests: 0,
    };
  }
}
