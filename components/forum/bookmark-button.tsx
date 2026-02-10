'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

interface BookmarkButtonProps {
  threadId?: string;
  postId?: string;
  initialBookmarked?: boolean;
  size?: 'sm' | 'md' | 'icon';
  showLabel?: boolean;
}

export function BookmarkButton({
  threadId,
  postId,
  initialBookmarked = false,
  size = 'sm',
  showLabel = true
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleBookmark = async () => {
    if (!user) {
      toast.error(t('mustLoginToBookmark'));
      return;
    }

    setIsLoading(true);

    try {
      if (threadId) {
        const { data, error } = await supabase.rpc('toggle_thread_bookmark', {
          p_thread_id: threadId,
          p_user_id: user.id
        });

        if (error) throw error;

        if (data.success) {
          setIsBookmarked(data.bookmarked);
          toast.success(data.bookmarked ? t('addedToFavorites') : t('removedFromFavorites'));
        }
      } else if (postId) {
        const { data, error } = await supabase.rpc('toggle_post_bookmark', {
          p_post_id: postId,
          p_user_id: user.id
        });

        if (error) throw error;

        if (data.success) {
          setIsBookmarked(data.bookmarked);
          toast.success(data.bookmarked ? t('addedToFavorites') : t('removedFromFavorites'));
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error(t('bookmarkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 text-xs px-2 gap-1',
    md: 'h-8 text-sm px-3 gap-1.5',
    icon: 'h-8 w-8 p-0'
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            disabled={isLoading || !user}
            className={cn(
              sizeClasses[size],
              'transition-all',
              isBookmarked 
                ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-500/10 hover:bg-yellow-500/20' 
                : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
            )}
          >
            <Bookmark 
              className={cn(
                iconSize,
                'transition-all',
                isBookmarked && 'fill-current'
              )} 
            />
            {showLabel && size !== 'icon' && (
              <span className="hidden sm:inline">
                {isBookmarked ? t('bookmarked') : t('bookmarkSave')}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isBookmarked ? t('removeFromFavorites') : t('addToFavorites')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
