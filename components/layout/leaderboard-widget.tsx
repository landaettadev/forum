'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReputationBadge } from '@/components/user/reputation-badge';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type LeaderboardUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  reputation: number;
  reputation_level: string;
};

type LeaderboardWidgetProps = {
  countrySlug?: string;
  countryName?: string;
};

export function LeaderboardWidget({ countrySlug, countryName }: LeaderboardWidgetProps = {}) {
  const t = useTranslations('sidebar');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      if (countrySlug) {
        // Fetch top users for the specific country
        const { data: countryData } = await supabase
          .from('countries')
          .select('name')
          .eq('slug', countrySlug)
          .single();

        if (countryData) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, reputation, reputation_level')
            .eq('location_country', countryData.name)
            .order('reputation', { ascending: false, nullsFirst: false })
            .limit(5);

          if (error) throw error;
          setUsers((data || []).map(u => ({
            user_id: u.id,
            username: u.username,
            avatar_url: u.avatar_url,
            reputation: u.reputation ?? 0,
            reputation_level: u.reputation_level ?? 'newbie',
          })));
        }
      } else {
        const { data, error } = await supabase
          .rpc('get_reputation_leaderboard', { p_limit: 5 });

        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [countrySlug]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span>{t('topReputation')}{countryName ? ` - ${countryName}` : ''}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-6 h-6 bg-muted rounded" />
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('noReputationData')}
          </p>
        ) : (
          users.map((user, index) => (
            <Link
              key={user.user_id}
              href={`/usuaria/${user.username}`}
              className="flex items-center gap-3 hover:bg-[hsl(var(--forum-surface-hover))] p-1 rounded transition-colors"
            >
              <span className="w-6 text-center text-sm">
                {getRankIcon(index)}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
              </div>
              <ReputationBadge 
                reputation={user.reputation} 
                level={user.reputation_level}
                size="sm"
              />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
