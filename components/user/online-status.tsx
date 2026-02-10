'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// Hook to track user's online presence
export function useOnlinePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update presence immediately
    const updatePresence = () => {
      supabase.rpc('update_user_presence', { p_user_id: user.id });
    };

    updatePresence();

    // Update every 2 minutes
    const interval = setInterval(updatePresence, 120000);

    // Mark offline on page unload
    const handleUnload = () => {
      supabase.rpc('mark_user_offline', { p_user_id: user.id });
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [user]);
}

// Online indicator component
type OnlineIndicatorProps = {
  isOnline?: boolean;
  lastSeen?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

export function OnlineIndicator({ 
  isOnline, 
  lastSeen, 
  size = 'sm',
  showLabel = false 
}: OnlineIndicatorProps) {
  const t = useTranslations('common');
  // Consider online if explicitly online or seen in last 5 minutes
  const isActive = isOnline || (lastSeen && 
    new Date(lastSeen).getTime() > Date.now() - 5 * 60 * 1000);

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex items-center gap-1.5">
      <span 
        className={cn(
          "rounded-full flex-shrink-0",
          sizeClasses[size],
          isActive 
            ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" 
            : "bg-gray-400"
        )}
      />
      {showLabel && (
        <span className={cn(
          "text-xs",
          isActive ? "text-green-600" : "text-muted-foreground"
        )}>
          {isActive ? t('online') : t('offline')}
        </span>
      )}
    </div>
  );
}

// Avatar with online status badge
type AvatarWithStatusProps = {
  children: React.ReactNode;
  isOnline?: boolean;
  lastSeen?: string | null;
  className?: string;
};

export function AvatarWithStatus({ 
  children, 
  isOnline, 
  lastSeen,
  className 
}: AvatarWithStatusProps) {
  const isActive = isOnline || (lastSeen && 
    new Date(lastSeen).getTime() > Date.now() - 5 * 60 * 1000);

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <span 
        className={cn(
          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
          isActive ? "bg-green-500" : "bg-gray-400"
        )}
      />
    </div>
  );
}
