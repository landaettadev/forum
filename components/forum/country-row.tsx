'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Globe, ChevronRight, MessageSquare, FileText } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type LastPost = {
  thread_title?: string;
  thread_id?: string;
  created_at?: string;
  author_username?: string;
  author_avatar?: string;
};

type CountryRowProps = {
  title?: string;
  highlighted?: boolean;
  countries: {
    id: string;
    name: string;
    name_es: string;
    slug: string;
    flag_emoji: string;
    iso_code?: string;
    capacity_level: string;
    continent_id: string;
    thread_count?: number;
    post_count?: number;
    last_post?: LastPost | null;
    regions: {
      name: string;
      slug: string;
    }[];
  }[];
};

export function CountryRow({ countries, title, highlighted = false }: CountryRowProps) {
  const t = useTranslations('forum');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  
  if (!countries || countries.length === 0) return null;

  const formatLastPostDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) {
      return t('justNow');
    } else if (diffMins < 60) {
      return t('minutesAgo', { count: diffMins });
    } else if (diffHours < 24 && isToday(date)) {
      return `${t('today')} ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `${t('yesterday')} ${format(date, 'HH:mm')}`;
    } else if (diffHours < 168) {
      return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
    } else {
      return format(date, 'dd MMM yyyy', { locale: dateLocale });
    }
  };

  const getCountryName = (country: any) => {
    const localeMap: Record<string, string> = {
      'es': country.name_es,
      'en': country.name_en,
      'fr': country.name_fr,
      'pt': country.name_pt,
      'de': country.name_de,
      'it': country.name_it,
      'ja': country.name_ja,
      'zh': country.name_zh,
      'ru': country.name_ru,
      'ar': country.name_ar,
      'ko': country.name_ko,
      'hi': country.name_hi,
      'tr': country.name_tr,
      'pl': country.name_pl,
      'nl': country.name_nl,
      'sv': country.name_sv,
      'id': country.name_id,
      'th': country.name_th,
    };
    return localeMap[locale] || country.name_en || country.name;
  };

  const getFlagUrl = (country: any) => {
    const code = (country.iso_code || '').toLowerCase();
    if (!code) return null;
    return `https://flagcdn.com/w40/${code}.png`;
  };

  return (
    <div className={`forum-surface mb-6 overflow-hidden ${highlighted ? 'ring-2 ring-[hsl(var(--forum-accent))] ring-offset-2 ring-offset-[hsl(var(--forum-bg))]' : ''}`}>
      {title && (
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[hsl(var(--forum-border))]/60">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--forum-gradient-from) / 0.15), hsl(var(--forum-gradient-to) / 0.1))' }}>
            <Globe className="h-3.5 w-3.5 text-[hsl(var(--forum-accent))]" />
          </div>
          <h2 className="font-bold text-xs tracking-wider uppercase forum-text-secondary">{title}</h2>
        </div>
      )}

      <div className="divide-y divide-[hsl(var(--forum-border))]">
        {countries.map((country) => {
          const flagUrl = getFlagUrl(country);
          return (
            <Link
              key={country.id}
              href={`/foros/${country.slug}`}
              className="flex items-center px-5 py-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-all duration-200 group gap-4"
            >
              {/* Flag image */}
              <div className="flex-shrink-0 w-10 h-7 relative overflow-hidden rounded-md shadow-sm group-hover:scale-110 transition-transform duration-300">
                {flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={getCountryName(country)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center text-lg">
                    {country.flag_emoji}
                  </div>
                )}
              </div>

              {/* Country info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[15px] group-hover:text-[hsl(var(--forum-accent))] transition-colors line-clamp-1">
                  {getCountryName(country)}
                </h3>
                {country.regions && country.regions.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {country.regions.slice(0, 6).map((r) => (
                      <span
                        key={r.slug}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[hsl(var(--forum-accent-muted))] text-[hsl(var(--forum-accent))] border border-[hsl(var(--forum-accent))]/10"
                      >
                        {r.name}
                      </span>
                    ))}
                    {country.regions.length > 6 && (
                      <span className="text-[10px] forum-text-muted font-medium">
                        +{country.regions.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                <div className="text-center min-w-[60px]">
                  <div className="text-xs font-bold">{country.thread_count || 0}</div>
                  <div className="text-[10px] forum-text-muted">{t('threads')}</div>
                </div>
                <div className="text-center min-w-[60px]">
                  <div className="text-xs font-bold">{country.post_count || 0}</div>
                  <div className="text-[10px] forum-text-muted">{t('posts')}</div>
                </div>
              </div>

              {/* Last post info */}
              <div className="hidden lg:flex items-center gap-2 flex-shrink-0 w-52 justify-end">
                {country.last_post?.created_at ? (
                  <>
                    <div className="flex-1 min-w-0 text-right">
                      {country.last_post.thread_title && (
                        <div className="text-xs font-medium truncate">
                          {country.last_post.thread_title}
                        </div>
                      )}
                      <div className="text-[11px] forum-text-muted">
                        {formatLastPostDate(country.last_post.created_at)}
                        {country.last_post.author_username && (
                          <span className="text-[hsl(var(--forum-accent))]"> {country.last_post.author_username}</span>
                        )}
                      </div>
                    </div>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={country.last_post.author_avatar || undefined} />
                      <AvatarFallback className="text-xs bg-[hsl(var(--forum-accent))] text-white">
                        {(country.last_post.author_username || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </>
                ) : (
                  <div className="flex-1 text-xs forum-text-muted text-right">
                    {t('noThreadsYet')}
                  </div>
                )}
              </div>

              <ChevronRight className="h-4 w-4 forum-text-muted group-hover:text-[hsl(var(--forum-accent))] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
