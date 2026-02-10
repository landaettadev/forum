'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

type FavoriteButtonProps = {
  threadId: string;
  initialFavorited?: boolean;
  size?: 'sm' | 'md';
};

export function FavoriteButton({ threadId, initialFavorited = false, size = 'sm' }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('favorites');

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('thread_bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('thread_id', threadId)
          .maybeSingle();

        setIsFavorite(!!data);
      } catch {}
    };

    checkFavoriteStatus();
  }, [threadId, user]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('toggle_thread_bookmark', {
        p_thread_id: threadId,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data.success) {
        setIsFavorite(data.bookmarked);
        toast.success(data.bookmarked ? t('added') : t('removed'));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleFavorite}
            disabled={isLoading || !user}
            className={cn(
              'p-1.5 rounded-full transition-all',
              isLoading ? 'opacity-50 cursor-not-allowed' : '',
              isFavorite 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-muted-foreground hover:text-red-500'
            )}
          >
            <Heart
              className={cn(
                iconSize,
                'transition-all',
                isFavorite && 'fill-current'
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
