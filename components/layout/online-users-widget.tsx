'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnlineIndicator } from '@/components/user/online-status';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type OnlineUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  last_seen_at: string;
  is_online: boolean;
};

export function OnlineUsersWidget() {
  const t = useTranslations('sidebar');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnlineUsers();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      const [usersResult, countResult] = await Promise.all([
        supabase.rpc('get_online_users', { p_limit: 12 }),
        supabase.rpc('get_online_users_count')
      ]);

      if (usersResult.data) setOnlineUsers(usersResult.data);
      if (countResult.data) setOnlineCount(countResult.data);
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-green-500" />
          <span>{t('onlineUsersTitle')}</span>
          <span className="ml-auto text-xs font-normal bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
            {onlineCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        ) : onlineUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('noUsersConnected')}
          </p>
        ) : (
          <div className="flex gap-1 flex-wrap">
            {onlineUsers.map((user) => (
              <Link
                key={user.user_id}
                href={`/usuaria/${user.username}`}
                className="group relative"
                title={user.username}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 transition-transform group-hover:scale-110">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
