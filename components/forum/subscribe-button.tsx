'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type SubscribeButtonProps = {
  threadId: string;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
};

export function SubscribeButton({ threadId, size = 'sm', showLabel = false }: SubscribeButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .rpc('is_subscribed_to_thread', { 
        p_thread_id: threadId, 
        p_user_id: user.id 
      });

    setIsSubscribed(!!data);
  }, [user, threadId]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, threadId, checkSubscription]);

  const toggleSubscription = async () => {
    if (!user) {
      toast.error(t('mustLoginToSubscribe'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('toggle_thread_subscription', {
          p_thread_id: threadId,
          p_user_id: user.id
        });

      if (error) throw error;

      if (data?.success) {
        setIsSubscribed(data.subscribed);
        toast.success(data.subscribed ? t('subscribed') : t('unsubscribedMsg'));
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error(t('subscribeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-9 w-9',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-5 w-5'
  };

  if (showLabel) {
    return (
      <Button
        variant={isSubscribed ? 'default' : 'outline'}
        size={size}
        onClick={toggleSubscription}
        disabled={isLoading || !user}
        className={cn(
          isSubscribed && 'bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]'
        )}
      >
        {isSubscribed ? (
          <>
            <Bell className={cn(iconSizes[size], 'mr-2')} />
            {t('subscribedLabel')}
          </>
        ) : (
          <>
            <BellOff className={cn(iconSizes[size], 'mr-2')} />
            {t('subscribeLabel')}
          </>
        )}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSubscription}
            disabled={isLoading || !user}
            className={cn(
              sizeClasses[size],
              isSubscribed && 'text-[hsl(var(--forum-accent))]'
            )}
          >
            {isSubscribed ? (
              <Bell className={cn(iconSizes[size], 'fill-current')} />
            ) : (
              <BellOff className={iconSizes[size]} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isSubscribed ? t('unsubscribe') : t('subscribe')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
