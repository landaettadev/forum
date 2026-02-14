'use client';

import { useEffect, useState } from 'react';
import { BookmarkButton } from './bookmark-button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Pin, Lock, Eye, MessageCircle, Flame, Tag, User, Calendar, MapPin } from 'lucide-react';
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
  forumName?: string;
  regionName?: string;
  countryName?: string;
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
  forumName,
  regionName,
  countryName,
}: ThreadHeaderProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('thread_bookmarks')
        .select('id')
        .eq('thread_id', threadId)
        .eq('user_id', user.id)
        .single();

      setIsBookmarked(!!data);
    };

    checkBookmark();
  }, [threadId, user]);

  const tagColors: Record<string, string> = {
    review: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ask: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    general: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const tagLabels: Record<string, string> = {
    review: '⭐ Review',
    ask: '❓ Question',
    general: '💬 Discussion',
  };

  const location = regionName
    ? countryName ? `${regionName}, ${countryName}` : regionName
    : countryName || forumName;

  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {tag && tagLabels[tag] && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tagColors[tag] || tagColors.general}`}>
                <Tag className="h-3 w-3" />
                {tagLabels[tag]}
              </span>
            )}
            {isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                <Pin className="h-3 w-3" />
                {t('pinned')}
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                <Lock className="h-3 w-3" />
                {t('locked')}
              </span>
            )}
            {isHot && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">
                <Flame className="h-3 w-3" />
                {t('hotTag')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm forum-text-secondary flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {viewsCount.toLocaleString()} {t('visitsCount')}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {repliesCount} {t('responsesCount')}
            </span>
            {authorUsername && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {authorUsername}
              </span>
            )}
            {createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={createdAt}>{new Date(createdAt).toLocaleDateString()}</time>
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
          </div>
          {/* Site attribution for SEO */}
          <p className="text-xs forum-text-muted mt-1">TS Rating — Community Forum</p>
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
