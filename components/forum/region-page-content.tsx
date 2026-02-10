'use client';

import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/locale-name';
import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Thread, Profile } from '@/lib/supabase';
import { ThreadRow } from './thread-row';

type ThreadWithRelations = Thread & {
  author: Profile;
  last_post_author?: Profile | null;
  forum?: { id: string; name: string; slug: string } | null;
  tag?: 'review' | 'ask' | 'general';
};

interface RegionPageContentProps {
  country: {
    name: string;
    name_es: string;
    slug: string;
    flag_emoji: string;
  };
  region: {
    id?: string;
    name: string;
    slug: string;
  };
  threads: ThreadWithRelations[] | null;
  forumId?: string;
  threadsCount?: number;
  postsCount?: number;
}

export function RegionPageContent({ country, region, threads, forumId, threadsCount = 0, postsCount = 0 }: RegionPageContentProps) {
  const t = useTranslations('forum');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const countryName = getLocalizedName(country, locale);

  return (
    <main className="flex-1">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm forum-text-muted mb-4">
          <Link href="/foros" className="hover:text-[hsl(var(--forum-accent))]">
            {tNav('forums')}
          </Link>
          <span>/</span>
          <Link href={`/foros/${country.slug}`} className="hover:text-[hsl(var(--forum-accent))] flex items-center gap-1">
            {country.flag_emoji} {countryName}
          </Link>
          <span>/</span>
          <span>{region.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <MapPin className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
              {region.name}
            </h1>
            <p className="forum-text-secondary">
              {t('forumOf', { name: region.name })}, {countryName} {country.flag_emoji}
            </p>
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <span className="text-lg font-bold text-[hsl(var(--forum-accent))]">{threadsCount}</span>
                <span className="text-xs forum-text-muted ml-1">{t('threads')}</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-[hsl(var(--forum-accent))]">{postsCount}</span>
                <span className="text-xs forum-text-muted ml-1">{t('posts')}</span>
              </div>
            </div>
          </div>

          <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white">
            <Link href={`/nuevo-hilo${forumId ? `?foro=${forumId}` : ''}${forumId && region.id ? `&region=${region.id}` : region.id ? `?region=${region.id}` : ''}`} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('newThread')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="forum-surface overflow-hidden rounded-lg">
        <div className="bg-[hsl(var(--forum-surface-alt))] px-4 py-3 border-b border-[hsl(var(--forum-border))] flex items-center justify-between">
          <h2 className="font-semibold">{t('recentThreads')}</h2>
          <span className="text-sm forum-text-muted">
            {t('threadsCount', { count: threads?.length || 0 })}
          </span>
        </div>

        {threads && threads.length > 0 ? (
          <div>
            {threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 forum-text-muted" />
            <h3 className="font-semibold mb-2">{t('noThreadsYet')}</h3>
            <p className="forum-text-muted mb-4">
              {t('beFirstToCreate', { name: region.name })}
            </p>
            <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white">
              <Link href={`/nuevo-hilo${forumId ? `?foro=${forumId}` : ''}${forumId && region.id ? `&region=${region.id}` : region.id ? `?region=${region.id}` : ''}`}>
                {t('createFirstThread')}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
