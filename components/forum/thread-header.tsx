'use client';

import { useEffect, useState } from 'react';
import { BookmarkButton } from './bookmark-button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Pin, Lock, Eye, MessageCircle, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ThreadHeaderProps {
  threadId: string;
  title: string;
  viewsCount: number;
  repliesCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isHot: boolean;
}

export function ThreadHeader({
  threadId,
  title,
  viewsCount,
  repliesCount,
  isPinned,
  isLocked,
  isHot
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

  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
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
          <div className="flex items-center gap-4 mt-2 text-sm forum-text-secondary">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {viewsCount.toLocaleString()} {t('visitsCount')}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {repliesCount} {t('responsesCount')}
            </span>
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
