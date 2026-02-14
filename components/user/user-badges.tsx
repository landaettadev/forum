'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Badge = {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  awarded_at: string;
};

type UserBadgesProps = {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  showAll?: boolean;
};

export function UserBadges({ userId, size = 'md', maxDisplay = 5, showAll = false }: UserBadgesProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_badges', { p_user_id: userId });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  if (loading || badges.length === 0) return null;

  const displayBadges = showAll ? badges : badges.slice(0, maxDisplay);
  const hiddenCount = badges.length - displayBadges.length;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {displayBadges.map((badge) => (
          <Tooltip key={badge.badge_id}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center justify-center cursor-default transition-transform hover:scale-110",
                  sizeClasses[size]
                )}
                style={{ filter: `drop-shadow(0 0 2px ${badge.color}40)` }}
              >
                {badge.icon}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="text-center">
                <div className="font-semibold flex items-center gap-1 justify-center">
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {badge.description}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground cursor-default",
                size === 'sm' ? 'text-[10px]' : 'text-xs'
              )}>
                +{hiddenCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Y {hiddenCount} insignias más</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact inline badges for post items
export function CompactUserBadges({ userId }: { userId: string }) {
  return <UserBadges userId={userId} size="sm" maxDisplay={3} />;
}
