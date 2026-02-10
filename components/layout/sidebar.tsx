'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { Users, MessageSquare, FileText, Clock, Trophy, Megaphone } from 'lucide-react';
import { LeaderboardWidget } from './leaderboard-widget';

type ForumStats = {
  totalUsers: number;
  totalThreads: number;
  totalPosts: number;
  onlineUsers: number;
};

type SidebarProps = {
  countrySlug?: string;
  countryName?: string;
};

export function Sidebar({ countrySlug, countryName }: SidebarProps = {}) {
  const t = useTranslations('sidebar');
  const [stats, setStats] = useState<ForumStats>({
    totalUsers: 0,
    totalThreads: 0,
    totalPosts: 0,
    onlineUsers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: usersCount },
        { count: threadsCount },
        { count: postsCount },
        { count: onlineCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('threads').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalUsers: usersCount || 0,
        totalThreads: threadsCount || 0,
        totalPosts: postsCount || 0,
        onlineUsers: onlineCount || 0,
      });
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 space-y-4">
      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-sm">{t('forumStats')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 forum-text-secondary">
              <Users className="h-4 w-4" />
              <span>{t('totalUsers')}</span>
            </div>
            <span className="font-semibold">{stats.totalUsers.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 forum-text-secondary">
              <FileText className="h-4 w-4" />
              <span>{t('totalThreads')}</span>
            </div>
            <span className="font-semibold">{stats.totalThreads.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 forum-text-secondary">
              <MessageSquare className="h-4 w-4" />
              <span>{t('totalPosts')}</span>
            </div>
            <span className="font-semibold">{stats.totalPosts.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--forum-border))]">
            <div className="flex items-center gap-2 forum-text-secondary">
              <div className="online-indicator"></div>
              <span>{t('onlineNow')}</span>
            </div>
            <span className="font-semibold text-[hsl(var(--forum-online))]">{stats.onlineUsers}</span>
          </div>
        </div>
      </div>

      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('recentActivity')}
        </h3>
        <div className="space-y-2 text-xs forum-text-secondary">
          <p>{t('recentActivityDesc')}</p>
        </div>
      </div>

      <LeaderboardWidget countrySlug={countrySlug} countryName={countryName} />

      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-sm">{t('usefulLinks')}</h3>
        <div className="space-y-2 text-sm">
          <Link href="/reglas" className="block hover:text-[hsl(var(--forum-accent))] transition-colors">
            {t('rules')}
          </Link>
          <Link href="/verificacion" className="block hover:text-[hsl(var(--forum-accent))] transition-colors">
            {t('verification')}
          </Link>
          <Link href="/buscar" className="block hover:text-[hsl(var(--forum-accent))] transition-colors">
            {t('advancedSearch')}
          </Link>
          <Link href="/faq" className="block hover:text-[hsl(var(--forum-accent))] transition-colors">
            {t('faq')}
          </Link>
          <Link href="/contacto" className="block hover:text-[hsl(var(--forum-accent))] transition-colors">
            {t('contact')}
          </Link>
          <Link href="/reputacion" className="block hover:text-[hsl(var(--forum-accent))] transition-colors">
            {t('reputation')}
          </Link>
          <Link href="/publicidad" className="flex items-center gap-2 hover:text-[hsl(var(--forum-accent))] transition-colors font-medium text-[hsl(var(--forum-accent))]">
            <Megaphone className="h-3.5 w-3.5" />
            Publicidad
          </Link>
        </div>
      </div>
    </aside>
  );
}
