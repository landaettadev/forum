'use client';

import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/locale-name';
import Link from 'next/link';
import { MapPin, ChevronRight, ArrowLeft, MessageSquare, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CountryPageContentProps {
  country: {
    id: string;
    name: string;
    name_es: string;
    slug: string;
    flag_emoji: string;
    iso_code: string;
  };
  regions: {
    id: string;
    name: string;
    slug: string;
  }[] | null;
  forums: {
    id: string;
    name: string;
    slug: string;
    description: string;
    threads_count: number;
    posts_count: number;
  }[] | null;
  regionStats?: Record<string, { threads_count: number; posts_count: number }>;
  lastThreadsByRegion?: Record<string, {
    id: string;
    title: string;
    last_post_at: string;
    author: { username: string; avatar_url: string | null };
  }>;
}

export function CountryPageContent({ country, regions, forums, regionStats = {}, lastThreadsByRegion = {} }: CountryPageContentProps) {
  const t = useTranslations('forum');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const countryName = getLocalizedName(country, locale);

  const flagUrl = country.iso_code ? `https://flagcdn.com/w80/${country.iso_code.toLowerCase()}.png` : null;

  // Aggregate totals across all regions
  const totalThreads = Object.values(regionStats).reduce((sum, s) => sum + s.threads_count, 0);
  const totalPosts = Object.values(regionStats).reduce((sum, s) => sum + s.posts_count, 0);

  return (
    <main className="flex-1">
      <div className="mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-sm forum-text-muted hover:text-[hsl(var(--forum-accent))] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToForums')}
        </Link>

        <div className="flex items-center gap-4 mb-2">
          {flagUrl && (
            <div className="w-14 h-10 rounded overflow-hidden shadow-md flex-shrink-0">
              <img src={flagUrl} alt={countryName} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {countryName}
            </h1>
            <p className="forum-text-secondary text-sm">
              {t('forumsAndCommunities', { country: countryName })}
            </p>
          </div>
          <div className="ml-auto flex gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-[hsl(var(--forum-accent))]">{totalThreads}</div>
              <div className="text-xs forum-text-muted">{t('threads')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[hsl(var(--forum-accent))]">{totalPosts}</div>
              <div className="text-xs forum-text-muted">{t('posts')}</div>
            </div>
          </div>
        </div>
      </div>

      {(regions && regions.length > 0) ? (
        <div className="forum-surface overflow-hidden rounded-lg border border-[hsl(var(--forum-border))]">
          <div className="flex items-center gap-2 px-5 py-3 bg-[hsl(var(--forum-surface-alt))] border-b border-[hsl(var(--forum-border))]">
            <MapPin className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            <h2 className="font-bold text-sm tracking-wide uppercase forum-text">
              {t('citiesAndRegions')}
            </h2>
          </div>

          <div className="divide-y divide-[hsl(var(--forum-border))]">
            {regions.map((region) => (
              <Link
                key={region.id}
                href={`/foros/${country.slug}/${region.slug}`}
                className="flex items-center px-5 py-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors group gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--forum-accent))]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--forum-accent))]/20 transition-colors">
                  <MapPin className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] group-hover:text-[hsl(var(--forum-accent))] transition-colors">
                    {region.name}
                  </h3>
                  <p className="text-xs forum-text-muted">
                    {t('forumOf', { name: region.name })}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                  <div className="text-center min-w-[50px]">
                    <div className="text-xs font-bold text-[hsl(var(--forum-accent))]">{regionStats[region.id]?.threads_count || 0}</div>
                    <div className="text-[10px] forum-text-muted">{t('threads')}</div>
                  </div>
                  <div className="text-center min-w-[50px]">
                    <div className="text-xs font-bold text-[hsl(var(--forum-accent))]">{regionStats[region.id]?.posts_count || 0}</div>
                    <div className="text-[10px] forum-text-muted">{t('posts')}</div>
                  </div>
                </div>

                {lastThreadsByRegion[region.id] && (
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0 max-w-[220px]">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={lastThreadsByRegion[region.id].author?.avatar_url || undefined} />
                      <AvatarFallback className="bg-[hsl(var(--forum-accent))]/20 text-[hsl(var(--forum-accent))] text-[10px]">
                        {lastThreadsByRegion[region.id].author?.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" title={lastThreadsByRegion[region.id].title}>
                        {lastThreadsByRegion[region.id].title}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] forum-text-muted">
                        <span className="truncate">{lastThreadsByRegion[region.id].author?.username}</span>
                        <span>·</span>
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="flex-shrink-0">{formatDistanceToNow(new Date(lastThreadsByRegion[region.id].last_post_at), { addSuffix: true, locale: dateLocale })}</span>
                      </div>
                    </div>
                  </div>
                )}

                <ChevronRight className="h-4 w-4 forum-text-muted group-hover:text-[hsl(var(--forum-accent))] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="forum-surface rounded-lg border border-[hsl(var(--forum-border))] p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-3 forum-text-muted" />
          <h2 className="text-lg font-semibold mb-1">{t('noRegionsAvailable')}</h2>
          <p className="forum-text-muted text-sm">
            {t('noRegionsConfigured')}
          </p>
        </div>
      )}

      {forums && forums.length > 0 && (
        <div className="mt-6 forum-surface overflow-hidden rounded-lg border border-[hsl(var(--forum-border))]">
          <div className="flex items-center gap-2 px-5 py-3 bg-[hsl(var(--forum-surface-alt))] border-b border-[hsl(var(--forum-border))]">
            <Users className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            <h2 className="font-bold text-sm tracking-wide uppercase forum-text">
              {t('generalForumsOf', { country: countryName })}
            </h2>
          </div>

          <div className="divide-y divide-[hsl(var(--forum-border))]">
            {forums.map((forum) => (
              <Link
                key={forum.id}
                href={`/foro/${forum.slug}`}
                className="flex items-center px-5 py-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors group gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] group-hover:text-[hsl(var(--forum-accent))] transition-colors">
                    {forum.name}
                  </h3>
                  {forum.description && (
                    <p className="text-xs forum-text-muted line-clamp-1">{forum.description}</p>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                  <div className="text-center min-w-[60px]">
                    <div className="text-xs font-bold">{forum.threads_count || 0}</div>
                    <div className="text-[10px] forum-text-muted">{t('threads')}</div>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <div className="text-xs font-bold">{forum.posts_count || 0}</div>
                    <div className="text-[10px] forum-text-muted">{t('posts')}</div>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 forum-text-muted group-hover:text-[hsl(var(--forum-accent))] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
