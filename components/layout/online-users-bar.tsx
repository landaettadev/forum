'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface OnlineUser {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
}

export function OnlineUsersBar() {
  const t = useTranslations('sidebar');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, count, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role', { count: 'exact' })
        .gte('last_seen_at', fiveMinutesAgo)
        .order('last_seen_at', { ascending: false })
        .limit(30);

      if (!error) {
        setOnlineUsers(data || []);
        setOnlineCount(count || data?.length || 0);
      }
    };

    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="forum-surface border-t border-b border-[hsl(var(--forum-border))]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Users className="h-4 w-4 text-green-500" />
          <span className="text-sm font-semibold">{t('onlineNow')}</span>
          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {onlineCount}
          </span>
        </div>

        {onlineUsers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((user) => (
              <Link
                key={user.id}
                href={`/user/${user.username}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[hsl(var(--forum-surface-alt))] hover:bg-[hsl(var(--forum-border))] transition-colors group"
                title={user.username}
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-[hsl(var(--forum-accent))] text-white">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-[hsl(var(--forum-surface))]" />
                </div>
                <span className="text-xs font-medium group-hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {user.username}
                </span>
                {(user.role === 'admin' || user.role === 'mod') && (
                  <span className={`text-[10px] px-1 rounded ${
                    user.role === 'admin'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {user.role === 'admin' ? t('adminRole') : t('modRole')}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs forum-text-muted">{t('noUsersOnline')}</p>
        )}
      </div>
    </div>
  );
}
