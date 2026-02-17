'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/locale-name';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, ChevronRight, ArrowLeft, MessageSquare, Users, Clock, Sparkles } from 'lucide-react';
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
  autoPromoForum?: {
    id: string;
    name: string;
    slug: string;
    description: string;
  } | null;
  autoPromoStats?: { threads_count: number; posts_count: number };
}

export function CountryPageContent({ country, regions, forums, regionStats = {}, lastThreadsByRegion = {}, autoPromoForum, autoPromoStats }: CountryPageContentProps) {
  const t = useTranslations('forum');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const countryName = getLocalizedName(country, locale);
  const router = useRouter();

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

        <div className="flex flex-wrap items-center gap-4 mb-2">
          {flagUrl && (
            <div className="relative w-14 h-10 rounded overflow-hidden shadow-md flex-shrink-0">
              <Image src={flagUrl} alt={countryName} fill className="object-cover" sizes="56px" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">
              {countryName}
            </h1>
            <p className="forum-text-secondary text-sm">
              {t('forumsAndCommunities', { country: countryName })}
            </p>
          </div>
          <div className="flex gap-3 sm:gap-6 flex-shrink-0">
            <div className="text-center">
              <div className="text-sm sm:text-lg font-bold text-[hsl(var(--forum-accent))]">{totalThreads}</div>
              <div className="text-[10px] sm:text-xs forum-text-muted">{t('threads')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm sm:text-lg font-bold text-[hsl(var(--forum-accent))]">{totalPosts}</div>
              <div className="text-[10px] sm:text-xs forum-text-muted">{t('posts')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Autopromoción section — always first */}
      {autoPromoForum && (
        <div className="mb-6 forum-surface overflow-hidden rounded-lg border border-[hsl(var(--forum-accent))]/30">
          <div className="flex items-center gap-2 px-5 py-3 bg-[hsl(var(--forum-accent))]/10 border-b border-[hsl(var(--forum-accent))]/20">
            <Sparkles className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            <h2 className="font-bold text-sm tracking-wide uppercase text-[hsl(var(--forum-accent))]">
              {t('autopromotion')}
            </h2>
          </div>

          <Link
            href={`/foro/${autoPromoForum.slug}`}
            className="flex items-center px-3 sm:px-5 py-3 sm:py-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors group gap-2 sm:gap-4"
          >
            <div className="hidden sm:flex w-9 h-9 rounded-lg bg-[hsl(var(--forum-accent))]/15 items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--forum-accent))]/25 transition-colors">
              <Sparkles className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-[15px]">
                <span className="forum-hover-sweep">{autoPromoForum.name}</span>
              </h3>
              <p className="text-[11px] sm:text-xs forum-text-muted line-clamp-1 hidden sm:block">
                {autoPromoForum.description || t('autopromoDesc', { country: countryName })}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="text-center min-w-[32px] sm:min-w-[50px]">
                <div className="text-[11px] sm:text-xs font-bold text-[hsl(var(--forum-accent))]">{autoPromoStats?.threads_count || 0}</div>
                <div className="text-[9px] sm:text-[10px] forum-text-muted">{t('threads')}</div>
              </div>
              <div className="text-center min-w-[32px] sm:min-w-[50px]">
                <div className="text-[11px] sm:text-xs font-bold text-[hsl(var(--forum-accent))]">{autoPromoStats?.posts_count || 0}</div>
                <div className="text-[9px] sm:text-[10px] forum-text-muted">{t('posts')}</div>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 forum-text-muted group-hover:text-[hsl(var(--forum-accent))] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        </div>
      )}

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
              <div
                key={region.id}
                onClick={() => router.push(`/foros/${country.slug}/${region.slug}`)}
                className="flex items-center px-3 sm:px-5 py-3 sm:py-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors group gap-2 sm:gap-4 cursor-pointer"
              >
                <div className="hidden sm:flex w-9 h-9 rounded-lg bg-[hsl(var(--forum-accent))]/10 items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--forum-accent))]/20 transition-colors">
                  <MapPin className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-[15px]">
                    <Link href={`/foros/${country.slug}/${region.slug}`} onClick={(e) => e.stopPropagation()} className="forum-hover-sweep">
                      {region.name}
                    </Link>
                  </h3>
                  <p className="text-[11px] sm:text-xs forum-text-muted hidden sm:block">
                    {t('forumOf', { name: region.name })}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <div className="text-center min-w-[32px] sm:min-w-[50px]">
                    <div className="text-[11px] sm:text-xs font-bold text-[hsl(var(--forum-accent))]">{regionStats[region.id]?.threads_count || 0}</div>
                    <div className="text-[9px] sm:text-[10px] forum-text-muted">{t('threads')}</div>
                  </div>
                  <div className="text-center min-w-[32px] sm:min-w-[50px]">
                    <div className="text-[11px] sm:text-xs font-bold text-[hsl(var(--forum-accent))]">{regionStats[region.id]?.posts_count || 0}</div>
                    <div className="text-[9px] sm:text-[10px] forum-text-muted">{t('posts')}</div>
                  </div>
                </div>

                {lastThreadsByRegion[region.id] && (
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0 max-w-[220px]">
                    <Link href={`/user/${lastThreadsByRegion[region.id].author?.username}`} onClick={(e) => e.stopPropagation()}>
                      <Avatar className="h-7 w-7 flex-shrink-0 hover:ring-2 hover:ring-[hsl(var(--forum-accent))]/50 transition-all">
                        <AvatarImage src={lastThreadsByRegion[region.id].author?.avatar_url || undefined} />
                        <AvatarFallback className="bg-[hsl(var(--forum-accent))]/20 text-[hsl(var(--forum-accent))] text-[10px]">
                          {lastThreadsByRegion[region.id].author?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/hilo/${lastThreadsByRegion[region.id].id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-medium truncate block hover:text-[hsl(var(--forum-accent))] transition-colors"
                        title={lastThreadsByRegion[region.id].title}
                      >
                        {lastThreadsByRegion[region.id].title}
                      </Link>
                      <div className="flex items-center gap-1 text-[10px] forum-text-muted">
                        <Link
                          href={`/user/${lastThreadsByRegion[region.id].author?.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate hover:text-[hsl(var(--forum-accent))] transition-colors"
                        >
                          {lastThreadsByRegion[region.id].author?.username}
                        </Link>
                        <span>·</span>
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="flex-shrink-0">{formatDistanceToNow(new Date(lastThreadsByRegion[region.id].last_post_at), { addSuffix: true, locale: dateLocale })}</span>
                      </div>
                    </div>
                  </div>
                )}

                <ChevronRight className="h-4 w-4 forum-text-muted group-hover:text-[hsl(var(--forum-accent))] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
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
                className="flex items-center px-3 sm:px-5 py-3 sm:py-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors group gap-2 sm:gap-4"
              >
                <div className="hidden sm:flex w-9 h-9 rounded-lg bg-[hsl(var(--forum-accent-muted))] items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--forum-accent)/0.2)] transition-colors">
                  <MessageSquare className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-[15px]">
                    <span className="forum-hover-sweep">{forum.name}</span>
                  </h3>
                  {forum.description && (
                    <p className="text-[11px] sm:text-xs forum-text-muted line-clamp-1 hidden sm:block">{forum.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <div className="text-center min-w-[32px] sm:min-w-[60px]">
                    <div className="text-[11px] sm:text-xs font-bold">{forum.threads_count || 0}</div>
                    <div className="text-[9px] sm:text-[10px] forum-text-muted">{t('threads')}</div>
                  </div>
                  <div className="text-center min-w-[32px] sm:min-w-[60px]">
                    <div className="text-[11px] sm:text-xs font-bold">{forum.posts_count || 0}</div>
                    <div className="text-[9px] sm:text-[10px] forum-text-muted">{t('posts')}</div>
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
