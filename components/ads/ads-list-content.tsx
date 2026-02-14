'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Heart, 
  Eye, 
  Clock, 
  Star, 
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Verified,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { EscortAd, CountryOption, Region } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';

type AdsListContentProps = {
  ads: EscortAd[];
  countries: CountryOption[];
  regions: Region[];
  currentCountry?: string;
  currentRegion?: string;
  currentPage: number;
  totalPages: number;
  totalAds: number;
};

export function AdsListContent({
  ads,
  countries,
  regions,
  currentCountry,
  currentRegion,
  currentPage,
  totalPages,
  totalAds,
}: AdsListContentProps) {
  const t = useTranslations('ads');
  const locale = useLocale();
  const _dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCountryChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value === 'all') {
      params.delete('country');
      params.delete('region');
    } else {
      params.set('country', value);
      params.delete('region');
    }
    params.delete('page');
    router.push(`/anuncios?${params.toString()}`);
  };

  const handleRegionChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value === 'all') {
      params.delete('region');
    } else {
      params.set('region', value);
    }
    params.delete('page');
    router.push(`/anuncios?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', page.toString());
    router.push(`/anuncios?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold forum-text">{t('title')}</h1>
          <p className="forum-text-secondary mt-1">
            {t('subtitle', { count: totalAds })}
          </p>
        </div>
        <Link href="/anuncios/nuevo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {t('createAd')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Filter className="w-5 h-5 forum-text-muted" />
            
            <Select value={currentCountry || 'all'} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('selectCountry')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCountries')}</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.slug}>
                    {country.flag_emoji} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentCountry && regions.length > 0 && (
              <Select value={currentRegion || 'all'} onValueChange={handleRegionChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('selectRegion')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRegions')}</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.slug}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ads Grid */}
      {ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      ) : (
        <Card className="forum-surface border-[hsl(var(--forum-border))]">
          <CardContent className="p-12 text-center">
            <p className="forum-text-muted text-lg">{t('noAds')}</p>
            <p className="forum-text-secondary mt-2">{t('noAdsDescription')}</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AdCard({ ad }: { ad: EscortAd }) {
  const t = useTranslations('ads');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const primaryPhoto = ad.photos?.find(p => p.is_primary) || ad.photos?.[0];

  return (
    <Link href={`/anuncios/${ad.id}`}>
      <Card className="forum-surface border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))] transition-all overflow-hidden group">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-[hsl(var(--forum-surface-alt))]">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.thumbnail_url || primaryPhoto.url}
              alt={ad.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">📷</span>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-2">
            {ad.is_featured && (
              <Badge className="bg-yellow-500 text-black">
                <Star className="w-3 h-3 mr-1" />
                {t('featured')}
              </Badge>
            )}
            {ad.is_vip && (
              <Badge className="bg-purple-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                VIP
              </Badge>
            )}
            {ad.is_verified && (
              <Badge className="bg-green-500 text-white">
                <Verified className="w-3 h-3 mr-1" />
                {t('verified')}
              </Badge>
            )}
          </div>

          {/* Stats overlay */}
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Badge variant="secondary" className="bg-black/60 text-white">
              <Eye className="w-3 h-3 mr-1" />
              {ad.views_count}
            </Badge>
            <Badge variant="secondary" className="bg-black/60 text-white">
              <Heart className="w-3 h-3 mr-1" />
              {ad.favorites_count}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Title */}
          <h3 className="font-semibold forum-text truncate group-hover:text-[hsl(var(--forum-accent))]">
            {ad.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 mt-2 forum-text-secondary text-sm">
            <MapPin className="w-4 h-4" />
            <span>
              {ad.country?.flag_emoji} {ad.city || ad.region?.name || ad.country?.name}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-2 mt-3">
            {ad.age && (
              <Badge variant="outline" className="text-xs">
                {ad.age} {t('years')}
              </Badge>
            )}
            {ad.incall && (
              <Badge variant="outline" className="text-xs">
                {t('incall')}
              </Badge>
            )}
            {ad.outcall && (
              <Badge variant="outline" className="text-xs">
                {t('outcall')}
              </Badge>
            )}
          </div>

          {/* Price */}
          {ad.rates && Object.keys(ad.rates).length > 0 && (
            <div className="mt-3 font-semibold text-[hsl(var(--forum-accent))]">
              {t('from')} {ad.currency} {Math.min(...Object.values(ad.rates))}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1 mt-3 forum-text-muted text-xs">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true, locale: dateLocale })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
