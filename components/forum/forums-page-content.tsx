'use client';

import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/locale-name';
import Link from 'next/link';
import { Globe, ChevronRight } from 'lucide-react';

type ContinentWithCountries = {
  id: string;
  name: string;
  slug: string;
  name_es: string;
  display_order: number;
  countries: {
    id: string;
    name: string;
    slug: string;
    name_es: string;
    flag_emoji: string;
    capacity_level: string;
    display_order: number;
    regions: {
      id: string;
      name: string;
      slug: string;
    }[];
  }[];
};

interface ForumsPageContentProps {
  continentsWithData: ContinentWithCountries[];
}

export function ForumsPageContent({ continentsWithData }: ForumsPageContentProps) {
  const t = useTranslations('forum');
  const locale = useLocale();

  return (
    <main className="flex-1">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Globe className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
          {t('forumsByRegion')}
        </h1>
        <p className="forum-text-secondary">
          {t('exploreForums')}
        </p>
      </div>

      {continentsWithData.length > 0 ? (
        <div className="space-y-6">
          {continentsWithData.map((continent) => (
            <div key={continent.id} className="forum-surface overflow-hidden">
              <div className="bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] px-4 py-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  🌍 {getLocalizedName(continent, locale)}
                </h2>
              </div>

              <div className="divide-y divide-[hsl(var(--forum-border))]">
                {continent.countries.map((country) => (
                  <Link 
                    key={country.id} 
                    href={`/foros/${country.slug}`}
                    className="block p-4 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag_emoji}</span>
                        <div>
                          <h3 className="font-semibold text-lg">
                            <span className="forum-hover-sweep">{getLocalizedName(country, locale)}</span>
                          </h3>
                          {country.regions.length > 0 && (
                            <p className="text-sm forum-text-muted">
                              {country.regions.map((r) => r.name).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ChevronRight className="h-5 w-5 opacity-50" />
                      </div>
                    </div>
                  </Link>
                ))}

                {continent.countries.length === 0 && (
                  <div className="p-4 text-center forum-text-muted">
                    {t('noCountriesInContinent')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="forum-surface p-8 text-center">
          <Globe className="h-16 w-16 mx-auto mb-4 forum-text-muted" />
          <h2 className="text-xl font-semibold mb-2">{t('geographicForums')}</h2>
          <p className="forum-text-muted mb-4">
            {t('forumsComingSoon')}
          </p>
          <p className="text-sm forum-text-muted">
            {t('runMigration')}
          </p>
        </div>
      )}
    </main>
  );
}
