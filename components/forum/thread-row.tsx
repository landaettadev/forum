'use client';

import Link from 'next/link';
import { MessageSquare, Pin, Lock, TrendingUp, Eye } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import type { Thread, Profile } from '@/lib/supabase';
import { getDateFnsLocale } from '@/lib/date-locale';
import { ThreadTag } from './thread-tag';
import { threadUrl } from '@/lib/slug';
import { CompactBadges } from '@/components/user/profile-badges';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ThreadRowProps = {
  thread: Thread & {
    author: Profile;
    last_post_author?: Profile | null;
    tag?: 'review' | 'ask' | 'general';
  };
};

export function ThreadRow({ thread }: ThreadRowProps) {
  const tForum = useTranslations('forum');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);

  const _getThreadIcon = () => {
    if (thread.is_pinned) return <Pin className="h-5 w-5 text-[hsl(var(--forum-accent))]" />;
    if (thread.is_locked) return <Lock className="h-5 w-5 forum-text-muted" />;
    if (thread.is_hot) return <TrendingUp className="h-5 w-5 text-orange-500" />;
    return <MessageSquare className="h-5 w-5 forum-text-muted" />;
  };

  // Format relative date with time for last post
  const formatLastPostDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) {
      return tForum('justNow');
    } else if (diffMins < 60) {
      return tForum('minutesAgo', { count: diffMins });
    } else if (diffHours < 24 && isToday(date)) {
      return `${tForum('today')} ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `${tForum('yesterday')} ${format(date, 'HH:mm')}`;
    } else if (diffHours < 168) { // Less than 7 days
      return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
    } else {
      return format(date, 'dd MMM yyyy', { locale: dateLocale });
    }
  };

  // Calculate page numbers based on replies (assuming 20 posts per page)
  const postsPerPage = 20;
  const totalPages = Math.ceil((thread.replies_count + 1) / postsPerPage);
  const showPages = totalPages > 1;

  return (
    <div className="flex items-center hover:bg-[hsl(var(--forum-surface-hover))] transition-colors border-b border-[hsl(var(--forum-border))] last:border-b-0 px-2.5 sm:px-4 py-2.5 sm:py-3 gap-2.5 sm:gap-4">
      {/* Author avatar */}
      <Link
        href={`/user/${thread.author?.username}`}
        className="flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
          <AvatarImage src={thread.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs sm:text-sm font-bold bg-[hsl(var(--forum-accent))] text-white">
            {(thread.author?.username || '?').substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      {/* Thread info */}
      <Link
        href={`/hilo/${thread.id}`}
        className="flex-1 min-w-0"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {thread.is_pinned && (
            <Pin className="h-4 w-4 text-[hsl(var(--forum-accent))] flex-shrink-0" />
          )}
          {thread.is_locked && (
            <Lock className="h-4 w-4 forum-text-muted flex-shrink-0" />
          )}
          {thread.tag && <ThreadTag tag={thread.tag} />}
          <h3 className="font-semibold text-sm sm:text-[15px] line-clamp-1 forum-hover-sweep">
            {thread.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-[11px] sm:text-xs forum-text-secondary flex-wrap">
          <span className="text-[hsl(var(--forum-accent))] font-medium truncate max-w-[100px] sm:max-w-none">
            {thread.author?.username}
          </span>
          <CompactBadges 
            profile={{
              id: thread.author.id,
              role: thread.author.role,
              moderator_type: thread.author.moderator_type,
              is_verified: thread.author.is_verified,
              is_vip: thread.author.is_vip,
              is_escort: thread.author.is_escort,
              escort_verified_at: thread.author.escort_verified_at,
              likes_received: thread.author.likes_received || 0,
              dislikes_received: thread.author.dislikes_received || 0,
              posts_count: thread.author.posts_count || 0,
              threads_count: thread.author.threads_count || 0,
              thanks_received: thread.author.thanks_received || 0,
              created_at: thread.author.created_at
            }}
            size="xs"
          />
          <span className="forum-text-muted">{format(new Date(thread.created_at), 'd MMM yyyy', { locale: dateLocale })}</span>
          
          {/* Page numbers — hide on mobile */}
          {showPages && (
            <div className="hidden sm:flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => (
                <span 
                  key={i} 
                  className="px-1.5 py-0.5 bg-[hsl(var(--forum-surface-alt))] rounded text-[10px] font-medium hover:bg-[hsl(var(--forum-accent))] hover:text-white transition-colors"
                >
                  {i + 1}
                </span>
              ))}
              {totalPages > 4 && (
                <span className="px-1.5 py-0.5 bg-[hsl(var(--forum-surface-alt))] rounded text-[10px] font-medium">
                  {totalPages}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Stats: Responses & Views — compact on mobile, expanded on desktop */}
      <div className="flex items-center gap-0 flex-shrink-0">
        <div className="w-auto sm:w-24 text-center px-1.5 sm:px-3">
          <div className="text-[10px] sm:text-[11px] forum-text-muted hidden sm:block">{tForum('replies')}:</div>
          <div className="font-bold text-xs sm:text-sm flex sm:block items-center gap-0.5">
            <MessageSquare className="h-3 w-3 sm:hidden forum-text-muted" />
            {thread.replies_count.toLocaleString()}
          </div>
        </div>
        <div className="w-auto sm:w-24 text-center px-1.5 sm:px-3">
          <div className="text-[10px] sm:text-[11px] forum-text-muted hidden sm:block">{tForum('views')}:</div>
          <div className="font-bold text-xs sm:text-sm flex sm:block items-center gap-0.5">
            <Eye className="h-3 w-3 sm:hidden forum-text-muted" />
            {thread.views_count.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Last post info + avatar */}
      <div className="hidden lg:flex items-center gap-2 flex-shrink-0 w-48 justify-end">
        <div className="text-right min-w-0">
          <div className="text-xs font-medium truncate">
            {thread.last_post_at ? formatLastPostDate(thread.last_post_at) : '-'}
          </div>
          {thread.last_post_author ? (
            <Link
              href={`/user/${thread.last_post_author.username}`}
              className="text-xs truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="forum-hover-sweep" style={{ '--sweep-base': 'hsl(var(--forum-accent))' } as React.CSSProperties}>{thread.last_post_author.username}</span>
            </Link>
          ) : thread.author && (
            <Link
              href={`/user/${thread.author.username}`}
              className="text-xs truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="forum-hover-sweep" style={{ '--sweep-base': 'hsl(var(--forum-accent))' } as React.CSSProperties}>{thread.author.username}</span>
            </Link>
          )}
        </div>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={thread.last_post_author?.avatar_url || thread.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-[hsl(var(--forum-accent))] text-white">
            {(thread.last_post_author?.username || thread.author?.username || '?').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Favorite button */}
      <div className="flex items-center flex-shrink-0">
        <FavoriteButton threadId={thread.id} size="sm" />
      </div>
    </div>
  );
}
