'use client';

import { useState, useEffect } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type FollowButtonProps = {
  userId: string;
  username: string;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
};

export function FollowButton({ 
  userId, 
  username, 
  size = 'default', 
  showLabel = true,
  onFollowChange 
}: FollowButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('user');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.id !== userId) {
      checkFollowStatus();
    }
  }, [user, userId]);

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .rpc('is_following_user', { p_following_id: userId });
    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user) {
      toast.error(t('mustLoginToFollow'));
      return;
    }

    if (user.id === userId) {
      toast.error(t('cantFollowSelf'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('toggle_user_follow', { p_following_id: userId });

      if (error) throw error;

      if (data?.success) {
        setIsFollowing(data.following);
        onFollowChange?.(data.following);
        toast.success(data.following 
          ? t('nowFollowing', { username }) 
          : t('unfollowed', { username })
        );
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error(t('followError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button for own profile
  if (user?.id === userId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size={size}
      onClick={toggleFollow}
      disabled={isLoading || !user}
      className={cn(
        !isFollowing && 'bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]'
      )}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          {showLabel && <span className="ml-2">{t('following')}</span>}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {showLabel && <span className="ml-2">{t('follow')}</span>}
        </>
      )}
    </Button>
  );
}
