'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale } from 'next-intl';
import { MessageSquare, Clock, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentActivity {
  id: string;
  type: 'thread' | 'post';
  title: string;
  slug?: string;
  content?: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
    role: string;
    is_verified: boolean;
    is_vip: boolean;
    is_escort: boolean;
    escort_verified_at: string | null;
  };
  forum?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  region?: {
    id: string;
    name: string;
    slug: string;
    country: {
      slug: string;
      flag_emoji?: string;
    };
  } | null;
  thread?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface RecentActivityWidgetProps {
  countryId?: string;
  countryName?: string;
  compact?: boolean; // Mobile mode: show 3 items with expand
}

export function RecentActivityWidget({ countryId, countryName, compact = false }: RecentActivityWidgetProps = {}) {
  const t = useTranslations('sidebar');
  const tRoles = useTranslations('roles');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const COMPACT_INITIAL_COUNT = 3;

  useEffect(() => {
    const fetchRecentActivity = async () => {
      setLoading(true);

      // If countryId is provided, get region IDs for filtering
      let regionIds: string[] | null = null;
      if (countryId) {
        const { data: regions } = await supabase
          .from('regions')
          .select('id')
          .eq('country_id', countryId);
        regionIds = regions?.map((r: { id: string }) => r.id) || [];
      }
      
      // Fetch recent threads (last 5)
      let threadsQuery = supabase
        .from('threads')
        .select(`
          id,
          title,
          slug,
          created_at,
          author:profiles!threads_author_id_fkey(id, username, avatar_url, role, is_verified, is_vip, is_escort, escort_verified_at),
          forum:forums(id, name, slug),
          region:regions(id, name, slug, country:countries(slug, flag_emoji))
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (regionIds !== null && regionIds.length > 0) {
        // Filter by specific country's regions
        threadsQuery = threadsQuery.in('region_id', regionIds);
      } else if (regionIds !== null && regionIds.length === 0) {
        // Country has no regions, no results
        setActivities([]);
        setLoading(false);
        return;
      } else {
        // No countryId provided (home page) - show only threads WITH region_id (country threads)
        // This excludes admin forum threads which have no region_id
        threadsQuery = threadsQuery.not('region_id', 'is', null);
      }

      const { data: recentThreads } = await threadsQuery;

      // Fetch recent posts (last 5) with thread info
      // For country filtering, get thread IDs from those regions first
      let recentPosts = null;
      if (regionIds !== null && regionIds.length > 0) {
        const { data: countryThreads } = await supabase
          .from('threads')
          .select('id')
          .in('region_id', regionIds);
        const threadIds = countryThreads?.map((t: { id: string }) => t.id) || [];
        if (threadIds.length > 0) {
          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              author:profiles!posts_author_id_fkey(id, username, avatar_url, role, is_verified, is_vip, is_escort, escort_verified_at),
              thread:threads!posts_thread_id_fkey(id, title, slug, forum:forums(id, name, slug), region:regions(id, name, slug, country:countries(slug, flag_emoji)))
            `)
            .eq('is_first_post', false)
            .in('thread_id', threadIds)
            .order('created_at', { ascending: false })
            .limit(5);
          recentPosts = data;
        }
      } else {
        // Home page: get posts only from threads that have region_id (country threads)
        const { data: countryThreadsAll } = await supabase
          .from('threads')
          .select('id')
          .not('region_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100);
        
        const threadIdsAll = countryThreadsAll?.map((t: { id: string }) => t.id) || [];
        if (threadIdsAll.length > 0) {
          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              author:profiles!posts_author_id_fkey(id, username, avatar_url, role, is_verified, is_vip, is_escort, escort_verified_at),
              thread:threads!posts_thread_id_fkey(id, title, slug, forum:forums(id, name, slug), region:regions(id, name, slug, country:countries(slug, flag_emoji)))
            `)
            .eq('is_first_post', false)
            .in('thread_id', threadIdsAll)
            .order('created_at', { ascending: false })
            .limit(5);
          recentPosts = data;
        }
      }

      // Combine and sort by date
      const threadsActivity: RecentActivity[] = (recentThreads || []).map((t: { id: string; title: string; slug: string; created_at: string; author: unknown; forum: unknown; region: unknown }) => ({
        id: t.id,
        type: 'thread',
        title: t.title,
        slug: t.slug,
        created_at: t.created_at,
        author: t.author as unknown as RecentActivity['author'],
        forum: t.forum as unknown as RecentActivity['forum'],
        region: t.region as unknown as RecentActivity['region'],
      }));

      const postsActivity: RecentActivity[] = (recentPosts || []).map((p: { id: string; content: string; created_at: string; author: unknown; thread: { id: string; title: string; slug: string; forum: unknown; region: unknown } | null }) => ({
        id: p.id,
        type: 'post',
        title: p.thread?.title || '',
        content: p.content,
        created_at: p.created_at,
        author: p.author as unknown as RecentActivity['author'],
        forum: (p.thread?.forum as unknown as RecentActivity['forum']) || null,
        region: (p.thread?.region as unknown as RecentActivity['region']) || null,
        thread: p.thread ? { id: p.thread.id, title: p.thread.title, slug: p.thread.slug } : null,
      }));

      const combined = [...threadsActivity, ...postsActivity]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setActivities(combined);
      setLoading(false);
    };

    fetchRecentActivity();
  }, [countryId]);

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getBadgeLabel = (activity: RecentActivity) => {
    const author = activity.author;
    if (author.role === 'admin') return tRoles('roleAdmin');
    if (author.role === 'mod') return tRoles('roleMod');
    if (author.is_verified) return tRoles('roleVerified');
    if (author.is_vip) return tRoles('roleVip');
    return null;
  };

  const getBadgeClass = (activity: RecentActivity) => {
    const author = activity.author;
    if (author.role === 'admin') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (author.role === 'mod') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (author.is_verified) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (author.is_vip) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getActivityLink = (activity: RecentActivity) => {
    if (activity.type === 'thread') {
      if (activity.region?.country?.slug && activity.region?.slug && activity.slug) {
        return `/foros/${activity.region.country.slug}/${activity.region.slug}/${activity.slug}`;
      }
      return `/hilo/${activity.id}`;
    }
    // It's a post reply
    if (activity.thread) {
      if (activity.region?.country?.slug && activity.region?.slug && activity.thread.slug) {
        return `/foros/${activity.region.country.slug}/${activity.region.slug}/${activity.thread.slug}`;
      }
      return `/hilo/${activity.thread.id}`;
    }
    return '#';
  };

  const getForumBadge = (activity: RecentActivity) => {
    // Prefer region name (country threads) over forum name
    if (activity.region?.name) {
      return activity.region.name;
    }
    if (activity.forum?.name) {
      return activity.forum.name;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {countryName ? `Últimas actividades ${countryName}` : t('recentActivity')}
        </h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--forum-surface-alt))]" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-[hsl(var(--forum-surface-alt))] rounded w-3/4" />
                <div className="h-2 bg-[hsl(var(--forum-surface-alt))] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {countryName ? `Últimas actividades ${countryName}` : t('recentActivity')}
        </h3>
        <p className="text-xs forum-text-secondary">{t('recentActivityDesc')}</p>
      </div>
    );
  }

  // Determine which activities to show
  const visibleActivities = compact && !isExpanded 
    ? activities.slice(0, COMPACT_INITIAL_COUNT) 
    : activities;
  const hasMore = compact && activities.length > COMPACT_INITIAL_COUNT;
  const remainingCount = activities.length - COMPACT_INITIAL_COUNT;

  const renderActivityItem = (activity: RecentActivity) => {
    const badgeLabel = getBadgeLabel(activity);
    const badgeClass = getBadgeClass(activity);
    const forumBadge = getForumBadge(activity);
    const countryFlag = activity.region?.country?.flag_emoji;
    const regionLink = activity.region?.country?.slug && activity.region?.slug 
      ? `/foros/${activity.region.country.slug}/${activity.region.slug}`
      : null;
    
    return (
      <div
        key={`${activity.type}-${activity.id}`}
        className="flex gap-2 hover:bg-[hsl(var(--forum-surface-alt))] -mx-2 px-2 py-1.5 rounded transition-colors"
      >
        <Link href={`/user/${activity.author.username}`} className="flex-shrink-0 relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.author.avatar_url || undefined} />
            <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-[10px]">
              {getUserInitials(activity.author.username)}
            </AvatarFallback>
          </Avatar>
          {activity.type === 'post' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[hsl(var(--forum-accent))] rounded-full flex items-center justify-center">
              <CornerDownRight className="w-2 h-2 text-white" />
            </div>
          )}
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link 
              href={`/user/${activity.author.username}`}
              className="font-medium text-sm truncate hover:text-[hsl(var(--forum-accent))] transition-colors"
            >
              {activity.author.username}
            </Link>
            {badgeLabel && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeClass}`}>
                {badgeLabel}
              </span>
            )}
          </div>
          
          <Link 
            href={getActivityLink(activity)}
            className="text-xs text-muted-foreground line-clamp-1 mt-0.5 hover:text-[hsl(var(--forum-accent))] transition-colors block"
          >
            {activity.type === 'thread' ? (
              <>
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {activity.title}
              </>
            ) : (
              <>
                <CornerDownRight className="w-3 h-3 inline mr-1" />
                {activity.thread?.title}
              </>
            )}
          </Link>
          
          <div className="flex items-center gap-2 mt-0.5">
            {forumBadge && regionLink ? (
              <Link 
                href={regionLink}
                className="text-[10px] text-[hsl(var(--forum-accent))] font-medium hover:underline flex items-center gap-1"
              >
                {countryFlag && <span>{countryFlag}</span>}
                {forumBadge}
              </Link>
            ) : forumBadge ? (
              <span className="text-[10px] text-[hsl(var(--forum-accent))] font-medium flex items-center gap-1">
                {countryFlag && <span>{countryFlag}</span>}
                {forumBadge}
              </span>
            ) : null}
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: dateLocale })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="forum-surface p-4 relative overflow-hidden">
      <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        {countryName ? `Últimas actividades ${countryName}` : t('recentActivity')}
      </h3>
      
      <div className="relative">
        <div className={cn(
          "space-y-3 transition-all duration-300 ease-out",
          compact && !isExpanded && "pb-2"
        )}>
          {visibleActivities.map(renderActivityItem)}
        </div>

        {/* Fade gradient effect when collapsed */}
        {compact && hasMore && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[hsl(var(--forum-surface))] via-[hsl(var(--forum-surface))]/80 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand/Collapse button for compact mode */}
      {compact && hasMore && (
        <div className={cn(
          "relative z-10",
          !isExpanded && "-mt-4"
        )}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl",
              "bg-gradient-to-r from-[hsl(var(--forum-accent))]/10 via-[hsl(var(--forum-accent))]/15 to-[hsl(var(--forum-accent))]/10",
              "hover:from-[hsl(var(--forum-accent))]/20 hover:via-[hsl(var(--forum-accent))]/25 hover:to-[hsl(var(--forum-accent))]/20",
              "border border-[hsl(var(--forum-accent))]/20 hover:border-[hsl(var(--forum-accent))]/40",
              "text-[hsl(var(--forum-accent))] font-medium text-sm",
              "transition-all duration-300 ease-out",
              "shadow-sm hover:shadow-md",
              "group"
            )}
          >
            <span className="flex items-center gap-1.5">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  {t('showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                  {t('showMore')} 
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[hsl(var(--forum-accent))]/20 text-xs font-semibold">
                    +{remainingCount}
                  </span>
                </>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
