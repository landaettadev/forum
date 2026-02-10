'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface OnlineUser {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
}

export function OnlineWidget() {
  const t = useTranslations('sidebar');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [staffOnline, setStaffOnline] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role')
        .gte('last_seen_at', fiveMinutesAgo)
        .order('last_seen_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setOnlineUsers(data.slice(0, 10));
        setOnlineCount(data.length);
        setStaffOnline(data.filter((u: OnlineUser) => u.role === 'admin' || u.role === 'mod'));
      }
    };

    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="forum-surface border-[hsl(var(--forum-border))]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-green-500" />
          <span>{t('onlineNow')}</span>
          <span className="ml-auto bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
            {onlineCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {onlineUsers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {onlineUsers.map((user) => (
              <Link
                key={user.id}
                href={`/usuaria/${user.username}`}
                title={user.username}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-green-500">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-[hsl(var(--forum-accent))] text-white">
                      {getUserInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[hsl(var(--forum-surface))]" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs forum-text-muted">{t('noUsersOnline')}</p>
        )}

        {staffOnline.length > 0 && (
          <div className="pt-2 border-t border-[hsl(var(--forum-border))]">
            <div className="flex items-center gap-2 text-xs forum-text-muted mb-2">
              <Shield className="h-3 w-3" />
              <span>{t('staffOnline')}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {staffOnline.map((user) => (
                <Link
                  key={user.id}
                  href={`/usuaria/${user.username}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[hsl(var(--forum-surface-alt))] hover:bg-[hsl(var(--forum-border))] transition-colors"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-[hsl(var(--forum-mod))] text-white">
                      {getUserInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{user.username}</span>
                  <span className={`text-[10px] px-1 rounded ${
                    user.role === 'admin' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {user.role === 'admin' ? t('adminRole') : t('modRole')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
