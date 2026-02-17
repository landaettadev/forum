'use client';

import { useEffect, useState } from 'react';
import { BookmarkButton } from './bookmark-button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Pin, Lock, Eye, MessageCircle, Flame, Tag, User, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ThreadHeaderProps {
  threadId: string;
  title: string;
  viewsCount: number;
  repliesCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isHot: boolean;
  tag?: string;
  authorUsername?: string;
  createdAt?: string;
}

export function ThreadHeader({
  threadId,
  title,
  viewsCount,
  repliesCount,
  isPinned,
  isLocked,
  isHot,
  tag,
  authorUsername,
  createdAt,
}: ThreadHeaderProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('thread_bookmarks')
          .select('id')
          .eq('thread_id', threadId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error) {
          setIsBookmarked(!!data);
        }
      } catch {
        // Table may not exist yet
      }
    };

    checkBookmark();
  }, [threadId, user]);

  const tagColors: Record<string, string> = {
    review: 'bg-emerald-900/15 text-emerald-400/80 border-emerald-800/20',
    ask: 'bg-slate-700/15 text-slate-400/80 border-slate-600/20',
    general: 'bg-slate-700/15 text-slate-500/70 border-slate-600/20',
  };

  const tagLabels: Record<string, string> = {
    review: '⭐ Review',
    ask: '❓ Question',
    general: '', // Empty - don't show in header, only in card
  };

  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Status badges — quiet, subdued */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {tag && tagLabels[tag] && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${tagColors[tag] || tagColors.general}`}>
                <Tag className="h-2.5 w-2.5" />
                {tagLabels[tag]}
              </span>
            )}
            {isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-700/15 text-slate-400/70 border border-slate-600/20">
                <Pin className="h-2.5 w-2.5" />
                {t('pinned')}
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-900/15 text-red-400/60 border border-red-800/20">
                <Lock className="h-2.5 w-2.5" />
                {t('locked')}
              </span>
            )}
            {isHot && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-900/15 text-amber-500/60 border border-amber-800/20">
                <Flame className="h-2.5 w-2.5" />
                {t('hotTag')}
              </span>
            )}
          </div>

          <h1 className="text-lg sm:text-[22px] font-semibold tracking-tight leading-tight">{title}</h1>

          {/* Meta stats — very quiet */}
          <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-4 text-[11px] sm:text-[12px] forum-text-muted opacity-70 flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 opacity-60" />
              {viewsCount.toLocaleString()}
            </span>
            <span className="opacity-30">·</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5 opacity-60" />
              {repliesCount}
            </span>
            {authorUsername && (
              <>
                <span className="opacity-30">·</span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 opacity-60" />
                  {authorUsername}
                </span>
              </>
            )}
            {createdAt && (
              <>
                <span className="opacity-30">·</span>
                <time dateTime={createdAt} className="opacity-60">{new Date(createdAt).toLocaleDateString()}</time>
              </>
            )}
          </div>
        </div>
        <BookmarkButton
          threadId={threadId}
          initialBookmarked={isBookmarked}
          size="md"
          showLabel={true}
        />
      </div>
    </div>
  );
}
