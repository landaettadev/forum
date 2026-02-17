'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Users, MessageSquare, FileText, Megaphone } from 'lucide-react';
import { RecentActivityWidget } from './recent-activity-widget';
import { BannerSlot } from '@/components/ads/banner-slot';
import { supabase } from '@/lib/supabase';

type ForumStats = {
  totalUsers: number;
  totalThreads: number;
  totalPosts: number;
  onlineRegistered: number;
  onlineGuests: number;
};

type SidebarProps = {
  countrySlug?: string;
  countryName?: string;
  countryId?: string;
  regionId?: string;
  stats?: ForumStats;
};

const defaultStats: ForumStats = { totalUsers: 0, totalThreads: 0, totalPosts: 0, onlineRegistered: 0, onlineGuests: 0 };

export function Sidebar({ countrySlug: _countrySlug, countryName, countryId, regionId, stats }: SidebarProps = {}) {
  const t = useTranslations('sidebar');
  const [fetchedStats, setFetchedStats] = useState<ForumStats | null>(null);

  useEffect(() => {
    if (stats) return; // Skip fetch if stats were passed as prop
    const fetchStats = async () => {
      const [usersRes, threadsRes, postsRes, onlineRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('threads').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .or('is_online.eq.true,last_seen_at.gte.' + new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      ]);
      const onlineRegistered = onlineRes.count ?? 0;
      setFetchedStats({
        totalUsers: usersRes.count ?? 0,
        totalThreads: threadsRes.count ?? 0,
        totalPosts: postsRes.count ?? 0,
        onlineRegistered,
        onlineGuests: onlineRegistered > 0 ? Math.max(1, Math.floor(onlineRegistered * 2.5)) : 0,
      });
    };
    fetchStats();
  }, [stats]);

  const s = stats ?? fetchedStats ?? defaultStats;
  const zoneType = countryId ? ('city' as const) : ('home_country' as const);

  return (
    <aside className="w-80 flex-shrink-0 space-y-4">
      {/* 1. Recent Activity */}
      <RecentActivityWidget countryId={countryId} countryName={countryName} />

      {/* 2. Banner */}
      <BannerSlot position="sidebar" zoneType={zoneType} countryId={countryId} regionId={regionId} />

      {/* 3. Useful Links */}
      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted">{t('usefulLinks')}</h3>
        <div className="space-y-1.5 text-sm">
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
            {t('advertising')}
          </Link>
        </div>
      </div>

      {/* 5. Forum Stats (moved to bottom) */}
      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted">{t('forumStats')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-[hsl(var(--forum-surface-alt))]">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3 w-3 forum-text-muted" />
              <span className="text-[10px] forum-text-muted">{t('totalUsers')}</span>
            </div>
            <div className="text-lg font-bold">{s.totalUsers.toLocaleString()}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[hsl(var(--forum-surface-alt))]">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-3 w-3 forum-text-muted" />
              <span className="text-[10px] forum-text-muted">{t('totalThreads')}</span>
            </div>
            <div className="text-lg font-bold">{s.totalThreads.toLocaleString()}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[hsl(var(--forum-surface-alt))]">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="h-3 w-3 forum-text-muted" />
              <span className="text-[10px] forum-text-muted">{t('totalPosts')}</span>
            </div>
            <div className="text-lg font-bold">{s.totalPosts.toLocaleString()}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[hsl(var(--forum-surface-alt))]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="online-indicator"></div>
              <span className="text-[10px] forum-text-muted">{t('onlineNow')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-500">{s.onlineRegistered}</span>
              <span className="text-xs text-gray-400">+ {s.onlineGuests} {t('guests')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom banner */}
      <BannerSlot position="sidebar_bottom" zoneType={zoneType} countryId={countryId} regionId={regionId} />
    </aside>
  );
}
