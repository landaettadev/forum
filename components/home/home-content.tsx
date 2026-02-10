'use client';

import { useTranslations } from 'next-intl';
import { CountryRow } from '@/components/forum/country-row';
import { MapPin } from 'lucide-react';

type HomeContentProps = {
  countriesByContinent: Record<string, { label: string; countries: any[] }>;
  userCountrySlug?: string;
  userCountryCode?: string;
};

export function HomeContent({ countriesByContinent, userCountrySlug, userCountryCode }: HomeContentProps) {
  const t = useTranslations('home');
  const tForum = useTranslations('forum');

  // Find user's country to show first
  let userCountry: any = null;
  let userCountryContinent: string | null = null;
  
  if (userCountrySlug) {
    for (const [continentSlug, info] of Object.entries(countriesByContinent)) {
      const found = info.countries.find(c => c.slug === userCountrySlug);
      if (found) {
        userCountry = found;
        userCountryContinent = continentSlug;
        break;
      }
    }
  }

  const continentEntries = Object.entries(countriesByContinent) as [string, { label: string; countries: any[] }][];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] bg-clip-text text-transparent">
          TransForo
        </h1>
        <p className="text-lg forum-text-secondary leading-relaxed">
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
    </>
  );
}
