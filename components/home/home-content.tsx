'use client';

import { useTranslations } from 'next-intl';
import { CountryRow } from '@/components/forum/country-row';
import Link from 'next/link';
import { MapPin, Headphones, Megaphone, BookOpen, ChevronRight, Folder } from 'lucide-react';

type AdminForum = {
  id: string;
  name: string;
  slug: string;
  description: string;
  forum_type: string | null;
  threads_count: number;
  posts_count: number;
};

type HomeContentProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countriesByContinent: Record<string, { label: string; countries: any[] }>;
  userCountrySlug?: string;
  userCountryCode?: string;
  adminForums?: AdminForum[];
};

const FORUM_TYPE_ICONS: Record<string, typeof Headphones> = {
  support: Headphones,
  news: Megaphone,
  rules: BookOpen,
};

export function HomeContent({ countriesByContinent, userCountrySlug, userCountryCode: _userCountryCode, adminForums = [] }: HomeContentProps) {
  const t = useTranslations('home');
  const tForum = useTranslations('forum');
  const tAdmin = useTranslations('adminForumSection');

  // Find user's country to show first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userCountry: any = null;
  let _userCountryContinent: string | null = null;
  
  if (userCountrySlug) {
    for (const [continentSlug, info] of Object.entries(countriesByContinent)) {
      const found = info.countries.find(c => c.slug === userCountrySlug);
      if (found) {
        userCountry = found;
        _userCountryContinent = continentSlug;
        break;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const continentEntries = Object.entries(countriesByContinent) as [string, { label: string; countries: any[] }][];

  return (
    <>
      <div className="mb-8 forum-hero-gradient rounded-2xl p-6 sm:p-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 forum-gradient-text">
          TS Rating
        </h1>
        <p className="text-base sm:text-lg forum-text-secondary leading-relaxed max-w-2xl">
          {t('description')}
        </p>
      </div>

      {/* Show user's country first if detected */}
      {userCountry && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-[hsl(var(--forum-accent))]" />
            <h2 className="text-lg font-semibold forum-text">{t('yourCountry')}</h2>
          </div>
          <CountryRow 
            title="" 
            countries={[userCountry]} 
            highlighted={true}
          />
        </div>
      )}

      {continentEntries.map(([continentSlug, info]) => (
        <CountryRow key={continentSlug} title={`${tForum('region')}: ${info.label}`} countries={info.countries} />
      ))}

      {Object.keys(countriesByContinent).length === 0 && (
        <div className="forum-surface p-8 text-center">
          <p className="forum-text-muted mb-4">{t('noCountriesAvailable')}</p>
          <div className="forum-text-secondary text-sm">
            <p className="mb-2">⚠️ {t('migrationRequired')}</p>
            <p className="mb-2">{t('runCommand')}</p>
            <code className="bg-[hsl(var(--forum-surface-alt))] px-3 py-2 rounded text-xs block">
              supabase db push
            </code>
            <p className="mt-3">{t('orCopy')} <code className="bg-[hsl(var(--forum-surface-alt))] px-2 py-1 rounded text-xs">supabase/migrations/003_geographic_data.sql</code></p>
          </div>
        </div>
      )}

      {/* Admin Forums Section */}
      {adminForums.length > 0 && (
        <div className="mt-8">
          <div className="forum-surface overflow-hidden">
            <div className="bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] px-4 py-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Folder className="h-5 w-5" />
                {tAdmin('categoryTitle')}
              </h2>
            </div>

            <div className="divide-y divide-[hsl(var(--forum-border))]">
              {adminForums.map((forum) => {
                const Icon = FORUM_TYPE_ICONS[forum.forum_type || ''] || Folder;
                return (
                  <Link
                    key={forum.id}
                    href={`/foro/${forum.slug}`}
                    className="block p-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 p-2 rounded-lg bg-[hsl(var(--forum-accent-muted))] flex-shrink-0">
                          <Icon className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {tAdmin(`forums.${forum.forum_type}.name`)}
                          </h3>
                          <p className="text-sm forum-text-secondary mt-0.5 line-clamp-2">
                            {tAdmin(`forums.${forum.forum_type}.description`)}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold">{forum.threads_count}</div>
                          <div className="text-xs forum-text-muted">{tForum('threads')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{forum.posts_count}</div>
                          <div className="text-xs forum-text-muted">{tForum('posts')}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 forum-text-muted flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
