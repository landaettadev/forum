'use client';

import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/locale-name';
import Link from 'next/link';
import { MapPin, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Thread, Profile } from '@/lib/supabase';
import { ThreadRow } from './thread-row';
import { useRouter } from 'next/navigation';

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
  const tMeta = useTranslations('metadata');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const countryName = getLocalizedName(country, locale);
  const currentYear = new Date().getFullYear();

  const handleSearchInRegion = () => {
    router.push(`/buscar?region=${region.slug}&country=${country.slug}`);
  };

  return (
    <main className="flex-1">
      {/* SEO descriptive text */}
      <p className="text-sm text-muted-foreground mb-4">
        {tMeta('regionPageDesc', { region: region.name, country: `${country.flag_emoji} ${countryName}`, year: currentYear.toString() })}
      </p>

      <div className="mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm forum-text-muted mb-3 sm:mb-4 overflow-x-auto scrollbar-none">
          <Link href="/foros" className="hover:text-[hsl(var(--forum-accent))]">
            <span className="forum-hover-sweep">{tNav('forums')}</span>
          </Link>
          <span>/</span>
          <Link href={`/foros/${country.slug}`} className="hover:text-[hsl(var(--forum-accent))] flex items-center gap-1">
            {country.flag_emoji} <span className="forum-hover-sweep">{countryName}</span>
          </Link>
          <span>/</span>
          <span>{region.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              <MapPin className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[hsl(var(--forum-accent))] flex-shrink-0" />
              {region.name}
            </h1>
            <p className="forum-text-secondary text-xs sm:text-sm md:text-base">
              {t('forumOf', { name: region.name })}, {countryName} {country.flag_emoji}
            </p>
            <div className="flex gap-3 sm:gap-4 mt-1.5 sm:mt-2">
              <div className="text-center">
                <span className="text-sm sm:text-lg font-bold text-[hsl(var(--forum-accent))]">{threadsCount}</span>
                <span className="text-[10px] sm:text-xs forum-text-muted ml-1">{t('threads')}</span>
              </div>
              <div className="text-center">
                <span className="text-sm sm:text-lg font-bold text-[hsl(var(--forum-accent))]">{postsCount}</span>
                <span className="text-[10px] sm:text-xs forum-text-muted ml-1">{t('posts')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={handleSearchInRegion}
              className="w-full sm:w-auto"
            >
              <Search className="h-4 w-4 mr-2" />
              {tCommon('searchIn', { location: region.name })}
            </Button>
            <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white w-full sm:w-auto flex-shrink-0">
              <Link href={`/nuevo-hilo${forumId ? `?foro=${forumId}` : ''}${forumId && region.id ? `&region=${region.id}` : region.id ? `?region=${region.id}` : ''}`} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('newThread')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="forum-surface overflow-hidden rounded-lg">
        <div className="bg-[hsl(var(--forum-surface-alt))] px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[hsl(var(--forum-border))] flex items-center justify-between">
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
