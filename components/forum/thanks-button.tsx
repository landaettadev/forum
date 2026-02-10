'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
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

interface ThanksButtonProps {
  postId: string;
  postAuthorId: string;
  initialThanksCount: number;
  initialHasThanked: boolean;
  size?: 'sm' | 'md';
}

export function ThanksButton({
  postId,
  postAuthorId,
  initialThanksCount,
  initialHasThanked,
  size = 'sm'
}: ThanksButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');
  const [thanksCount, setThanksCount] = useState(initialThanksCount);
  const [hasThanked, setHasThanked] = useState(initialHasThanked);
  const [isLoading, setIsLoading] = useState(false);

  const isOwnPost = user?.id === postAuthorId;

  const handleThank = async () => {
    if (!user) {
      toast.error(t('mustLoginToThank'));
      return;
    }

    if (isOwnPost) {
      toast.error(t('cantThankOwnPost'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('thank_post', {
        p_post_id: postId,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data.success) {
        setHasThanked(data.action === 'thanked');
        setThanksCount(data.thanks_count);
        
        if (data.action === 'thanked') {
          toast.success(t('thanksSent'));
        }
      } else if (data.error === 'cannot_thank_own_post') {
        toast.error(t('cantThankOwnPost'));
      }
    } catch (error) {
      console.error('Error thanking post:', error);
      toast.error(t('thanksError'));
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 text-xs px-2 gap-1',
    md: 'h-8 text-sm px-3 gap-1.5'
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThank}
            disabled={isLoading || isOwnPost || !user}
            className={cn(
              sizeClasses[size],
              'transition-all',
              hasThanked 
                ? 'text-pink-500 hover:text-pink-600 bg-pink-500/10 hover:bg-pink-500/20' 
                : 'text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10',
              isOwnPost && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Heart 
              className={cn(
                iconSize,
                'transition-all',
                hasThanked && 'fill-current'
              )} 
            />
            <span>{thanksCount > 0 ? thanksCount : ''}</span>
            <span className="hidden sm:inline">
              {hasThanked ? t('thanked') : t('thanks')}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isOwnPost 
            ? t('cantThankOwnPost')
            : hasThanked 
              ? t('removeThanks') 
              : t('thankThisPost')
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
