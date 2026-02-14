'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, FileText, ThumbsUp, Users, Eye, TrendingUp 
} from 'lucide-react';
import { ReputationBadge } from './reputation-badge';
import { useTranslations } from 'next-intl';

type ProfileStats = {
  posts_count: number;
  threads_count: number;
  thanks_received: number;
  thanks_given: number;
  followers_count: number;
  following_count: number;
  profile_views: number;
  reputation: number;
  reputation_level: string;
};

type ProfileStatsProps = {
  userId: string;
  compact?: boolean;
};

export function ProfileStats({ userId, compact = false }: ProfileStatsProps) {
  const t = useTranslations('profileStats');
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_profile_stats', { p_user_id: userId });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-16 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {stats.posts_count}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {stats.threads_count}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-4 w-4" />
          {stats.thanks_received}
        </span>
        <ReputationBadge 
          reputation={stats.reputation} 
          level={stats.reputation_level}
          size="sm"
        />
      </div>
    );
  }

  const statItems = [
    { icon: MessageSquare, label: t('posts'), value: stats.posts_count, color: 'text-blue-500' },
    { icon: FileText, label: t('threads'), value: stats.threads_count, color: 'text-green-500' },
    { icon: ThumbsUp, label: t('thanksReceived'), value: stats.thanks_received, color: 'text-yellow-500' },
    { icon: Users, label: t('followers'), value: stats.followers_count, color: 'text-purple-500' },
    { icon: Users, label: t('following'), value: stats.following_count, color: 'text-pink-500' },
    { icon: Eye, label: t('profileViews'), value: stats.profile_views, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
        <ReputationBadge 
          reputation={stats.reputation} 
          level={stats.reputation_level}
          showPoints={true}
          size="lg"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statItems.map((item, index) => (
          <div 
            key={index}
            className="forum-surface p-3 rounded-lg text-center"
          >
            <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
            <div className="text-lg font-bold">{item.value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
