'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { BannerPosition, BannerFormat } from '@/lib/supabase';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// Shared promise so only ONE request ever checks if banner tables exist.
// All concurrent BannerSlot components will await the same promise.
let bannerCheckPromise: Promise<boolean> | null = null;

async function isBannerSystemAvailable(): Promise<boolean> {
  if (bannerCheckPromise) return bannerCheckPromise;
  bannerCheckPromise = (async () => {
    try {
      const { error } = await supabase
        .from('banner_ad_zones')
        .select('id', { count: 'exact', head: true })
        .limit(0);
      if (error && (error.code === '42P01' || error.message?.includes('404') || error.code === 'PGRST116')) {
        return false;
      }
      return !error;
    } catch {
      return false;
    }
  })();
  return bannerCheckPromise;
}

// Maps legacy position names to new BannerPosition values
const POSITION_MAP: Record<string, { bannerPos: BannerPosition; format: BannerFormat }> = {
  header: { bannerPos: 'header', format: '728x90' },
  footer: { bannerPos: 'footer', format: '728x90' },
  sidebar: { bannerPos: 'sidebar_top', format: '300x250' },
  sidebar_top: { bannerPos: 'sidebar_top', format: '300x250' },
  sidebar_bottom: { bannerPos: 'sidebar_bottom', format: '300x250' },
  content: { bannerPos: 'content', format: '728x90' },
};

interface BannerSlotProps {
  position: 'header' | 'footer' | 'sidebar' | 'sidebar_top' | 'sidebar_bottom' | 'content';
  zoneType?: 'home_country' | 'city';
  countryId?: string;
  regionId?: string;
  className?: string;
}

type BannerState =
  | { type: 'loading' }
  | { type: 'booking'; imageUrl: string; clickUrl: string | null; bookingId: string }
  | { type: 'fallback'; codeHtml: string; fallbackId: string }
  | { type: 'placeholder' };

export function BannerSlot({ position, zoneType, countryId, regionId, className }: BannerSlotProps) {
  const t = useTranslations('banners');
  const [state, setState] = useState<BannerState>({ type: 'placeholder' });
  const tracked = useRef(false);
  const mapping = POSITION_MAP[position] || POSITION_MAP.header;

  // Fixed dimensions prevent CLS (Cumulative Layout Shift) — Google Core Web Vitals
  const dimensions: Record<string, string> = {
    header: 'min-h-[90px] h-[90px] w-full max-w-[728px]',
    footer: 'min-h-[90px] h-[90px] w-full max-w-[728px]',
    sidebar: 'min-h-[250px] h-[250px] w-full max-w-[300px]',
    sidebar_top: 'min-h-[250px] h-[250px] w-full max-w-[300px]',
    sidebar_bottom: 'min-h-[250px] h-[250px] w-full max-w-[300px]',
    content: 'min-h-[90px] h-[90px] w-full max-w-[728px]',
  };

  const fetchBanner = useCallback(async () => {
    try {
      // Single shared check — only one network request ever made
      const available = await isBannerSystemAvailable();
      if (!available) {
        setState({ type: 'placeholder' });
        return;
      }

      // 1. Resolve zone
      let zoneQuery = supabase
        .from('banner_ad_zones')
        .select('id')
        .eq('zone_type', zoneType!)
        .eq('country_id', countryId!)
        .eq('is_active', true);

      if (zoneType === 'city' && regionId) {
        zoneQuery = zoneQuery.eq('region_id', regionId);
      } else {
        zoneQuery = zoneQuery.is('region_id', null);
      }

      const { data: zone, error: zoneError } = await zoneQuery.single();
      if (zoneError) {
        setState({ type: 'placeholder' });
        return;
      }
      if (!zone) {
        setState({ type: 'placeholder' });
        return;
      }

      // 2. Check for active booking
      const { data: bookingRows } = await supabase.rpc('get_active_banner', {
        p_zone_id: zone.id,
        p_position: mapping.bannerPos,
      });

      if (bookingRows && bookingRows.length > 0 && bookingRows[0].image_url) {
        setState({
          type: 'booking',
          imageUrl: bookingRows[0].image_url,
          clickUrl: bookingRows[0].click_url || null,
          bookingId: bookingRows[0].booking_id,
        });
        return;
      }

      // 3. Check for fallback ad code
      const { data: fallbackRows } = await supabase.rpc('get_banner_fallback', {
        p_zone_id: zone.id,
        p_position: mapping.bannerPos,
        p_format: mapping.format,
      });

      if (fallbackRows && fallbackRows.length > 0 && fallbackRows[0].code_html) {
        setState({
          type: 'fallback',
          codeHtml: fallbackRows[0].code_html,
          fallbackId: fallbackRows[0].fallback_id,
        });
        return;
      }

      // 4. Nothing — show placeholder
      setState({ type: 'placeholder' });
    } catch {
      setState({ type: 'placeholder' });
    }
  }, [zoneType, countryId, regionId, mapping.bannerPos, mapping.format]);

  useEffect(() => {
    tracked.current = false;
    if (!zoneType || !countryId) {
      setState({ type: 'placeholder' });
      return;
    }
    fetchBanner();
  }, [zoneType, countryId, regionId, position, fetchBanner]);

  // Track impression once when banner is shown
  useEffect(() => {
    if (tracked.current) return;
    if (state.type === 'booking' || state.type === 'fallback') {
      tracked.current = true;
      supabase.from('banner_impressions').insert({
        event_type: 'impression',
        booking_id: state.type === 'booking' ? state.bookingId : null,
        fallback_id: state.type === 'fallback' ? state.fallbackId : null,
        position: mapping.bannerPos,
      }).then(() => {});
    }
  }, [state, mapping.bannerPos]);

  const handleClick = () => {
    if (state.type === 'booking') {
      supabase.from('banner_impressions').insert({
        event_type: 'click',
        booking_id: state.bookingId,
        position: mapping.bannerPos,
      }).then(() => {});
    }
  };

  // --- Render ---

  // Active user booking — show their image
  if (state.type === 'booking') {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={state.imageUrl}
        alt={t('adSpace')}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    );

    return (
      <div className={cn(dimensions[position], 'overflow-hidden rounded-lg', className)}>
        {state.clickUrl ? (
          <a
            href={state.clickUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleClick}
            className="block w-full h-full"
          >
            {img}
          </a>
        ) : img}
      </div>
    );
  }

  // Fallback — render admin's third-party code
  if (state.type === 'fallback') {
    return (
      <div
        className={cn(dimensions[position], 'overflow-hidden rounded-lg', className)}
        dangerouslySetInnerHTML={{ __html: state.codeHtml }}
      />
    );
  }

  // Placeholder — no active ad
  return (
    <div
      className={cn(
        'flex items-center justify-center border border-dashed border-[hsl(var(--forum-border))] rounded-lg bg-[hsl(var(--forum-surface-alt))] overflow-hidden',
        dimensions[position],
        className
      )}
    >
      <Link href="/publicidad" className="text-center text-xs forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
        <div className="font-medium">{t('adSpace')}</div>
        <div className="text-[10px] opacity-70">
          {mapping.format === '728x90' && '728x90 - Leaderboard'}
          {mapping.format === '300x250' && '300x250 - Medium Rectangle'}
        </div>
        <div className="text-[10px] mt-0.5 text-[hsl(var(--forum-accent))] font-medium">
          {t('advertiseHere')}
        </div>
      </Link>
    </div>
  );
}
