'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Moderator = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  moderator_type: string | null;
};

export function ModeratorsWidget() {
  const t = useTranslations('sidebar');
  const [mods, setMods] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMods = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role, moderator_type')
          .in('role', ['admin', 'mod'])
          .order('role', { ascending: true })
          .limit(10);

        if (error) throw error;
        setMods(data || []);
      } catch (error) {
        console.error('Error fetching moderators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMods();
  }, []);

  return (
    <div className="forum-surface p-4">
      <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted flex items-center gap-2">
        <Shield className="h-3.5 w-3.5" />
        {t('moderators')}
      </h3>
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2.5 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-[hsl(var(--forum-surface-alt))]" />
                <div className="flex-1 h-3 bg-[hsl(var(--forum-surface-alt))] rounded" />
              </div>
            ))}
          </div>
        ) : mods.length === 0 ? (
          <p className="text-xs forum-text-muted text-center py-2">
            {t('noModerators')}
          </p>
        ) : (
          mods.map((mod) => (
            <Link
              key={mod.id}
              href={`/usuaria/${mod.username}`}
              className="flex items-center gap-2.5 hover:bg-[hsl(var(--forum-surface-hover))] p-1.5 rounded-lg transition-colors group"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={mod.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] font-semibold">
                  {mod.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {mod.username}
                </p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                mod.role === 'admin'
                  ? 'bg-[hsl(var(--forum-admin))]/15 text-[hsl(var(--forum-admin))]'
                  : 'bg-[hsl(var(--forum-accent))]/10 text-[hsl(var(--forum-accent))]'
              }`}>
                {mod.role === 'admin' ? 'Admin' : 'Mod'}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
