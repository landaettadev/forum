'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Users, MessageSquare, FileText, Clock, Megaphone } from 'lucide-react';
import { ModeratorsWidget } from './moderators-widget';

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
  stats?: ForumStats;
};

export function Sidebar({ countrySlug: _countrySlug, countryName: _countryName, stats }: SidebarProps = {}) {
  const t = useTranslations('sidebar');
  const s = stats ?? { totalUsers: 0, totalThreads: 0, totalPosts: 0, onlineRegistered: 0, onlineGuests: 0 };

  return (
    <aside className="w-64 flex-shrink-0 space-y-4">
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

      <div className="forum-surface p-4">
        <h3 className="font-semibold mb-3 text-xs tracking-wider uppercase forum-text-muted flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {t('recentActivity')}
        </h3>
        <div className="space-y-2 text-xs forum-text-secondary">
          <p>{t('recentActivityDesc')}</p>
        </div>
      </div>

      <ModeratorsWidget />

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
    </aside>
  );
}
