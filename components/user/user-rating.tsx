'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface UserRatingProps {
  userId: string;
  likesCount: number;
  dislikesCount: number;
  size?: 'sm' | 'md' | 'lg';
  showButtons?: boolean;
}

export function UserRating({ 
  userId, 
  likesCount, 
  dislikesCount, 
  size = 'md',
  showButtons = true 
}: UserRatingProps) {
  const { user } = useAuth();
  const t = useTranslations('rating');
  const [likes, setLikes] = useState(likesCount);
  const [dislikes, setDislikes] = useState(dislikesCount);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.id !== userId) {
      fetchUserRating();
    }
  }, [user, userId]);

  const fetchUserRating = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_ratings')
      .select('rating')
      .eq('rater_id', user.id)
      .eq('rated_user_id', userId)
      .maybeSingle();

    if (data) {
      setUserRating(data.rating);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user || user.id === userId) {
      toast.error(t('cantRateSelf'));
      return;
    }

    setIsLoading(true);

    try {
      if (userRating === rating) {
        // Remove rating
        await supabase
          .from('user_ratings')
          .delete()
          .eq('rater_id', user.id)
          .eq('rated_user_id', userId);

        if (rating === 1) {
          setLikes(prev => Math.max(prev - 1, 0));
        } else {
          setDislikes(prev => Math.max(prev - 1, 0));
        }
        setUserRating(null);
        toast.success(t('ratingRemoved'));
      } else if (userRating !== null) {
        // Update rating
        await supabase
          .from('user_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('rater_id', user.id)
          .eq('rated_user_id', userId);

        if (rating === 1) {
          setLikes(prev => prev + 1);
          setDislikes(prev => Math.max(prev - 1, 0));
        } else {
          setLikes(prev => Math.max(prev - 1, 0));
          setDislikes(prev => prev + 1);
        }
        setUserRating(rating);
        toast.success(t('ratingUpdated'));
      } else {
        // New rating
        await supabase
          .from('user_ratings')
          .insert({
            rater_id: user.id,
            rated_user_id: userId,
            rating
          });

        if (rating === 1) {
          setLikes(prev => prev + 1);
        } else {
          setDislikes(prev => prev + 1);
        }
        setUserRating(rating);
        toast.success(rating === 1 ? t('likedUser') : t('dislikedUser'));
      }
    } catch (error) {
      toast.error(t('ratingError'));
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const canRate = user && user.id !== userId && showButtons;

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      <div className="flex items-center gap-1">
        {canRate ? (
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${userRating === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
            onClick={() => handleRating(1)}
            disabled={isLoading}
          >
            <ThumbsUp size={iconSizes[size]} />
          </Button>
        ) : (
          <ThumbsUp size={iconSizes[size]} className="text-green-500" />
        )}
        <span className="text-green-500 font-medium">{likes}</span>
      </div>

      <div className="flex items-center gap-1">
        {canRate ? (
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${userRating === -1 ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            onClick={() => handleRating(-1)}
            disabled={isLoading}
          >
            <ThumbsDown size={iconSizes[size]} />
          </Button>
        ) : (
          <ThumbsDown size={iconSizes[size]} className="text-red-500" />
        )}
        <span className="text-red-500 font-medium">{dislikes}</span>
      </div>
    </div>
  );
}

export function UserRatingDisplay({ likes, dislikes, size = 'sm' }: { likes: number; dislikes: number; size?: 'sm' | 'md' | 'lg' }) {
  const iconSizes = { sm: 10, md: 12, lg: 14 };
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-0.5 text-green-500">
        <ThumbsUp size={iconSizes[size]} />
        {likes}
      </span>
      <span className="flex items-center gap-0.5 text-red-500">
        <ThumbsDown size={iconSizes[size]} />
        {dislikes}
      </span>
    </div>
  );
}
