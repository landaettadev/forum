/**
 * Core banner ads logic — fetching active banners, availability, zone resolution
 */

import { supabase } from './supabase';
import type { BannerAdZone, BannerPosition, BannerFormat } from './supabase';

/**
 * Resolve the ad zone for a given page context.
 * - Home page and country pages → home_country zone for that country
 * - Region/city pages → city zone for that region
 */
export async function resolveZone(
  zoneType: 'home_country' | 'city',
  countryId?: string,
  regionId?: string
): Promise<BannerAdZone | null> {
  let query = supabase
    .from('banner_ad_zones')
    .select('*')
    .eq('zone_type', zoneType)
    .eq('is_active', true);

  if (countryId) {
    query = query.eq('country_id', countryId);
  }

  if (zoneType === 'city' && regionId) {
    query = query.eq('region_id', regionId);
  } else if (zoneType === 'home_country') {
    query = query.is('region_id', null);
  }

  const { data } = await query.single();
  return data;
}

/**
 * Get the active banner booking for a specific zone + position right now.
 * Returns the booking with its image, or null if no active booking.
 */
export async function getActiveBanner(
  zoneId: string,
  position: BannerPosition
): Promise<{ bookingId: string; imageUrl: string; clickUrl: string | null } | null> {
  const { data } = await supabase.rpc('get_active_banner', {
    p_zone_id: zoneId,
    p_position: position,
  });

  if (data && data.length > 0) {
    const row = data[0];
    return {
      bookingId: row.booking_id,
      imageUrl: row.image_url,
      clickUrl: row.click_url || null,
    };
  }
  return null;
}

/**
 * Get the fallback ad code (third-party like JuicyAds) for a zone + position.
 */
export async function getFallbackCode(
  zoneId: string | null,
  position: BannerPosition,
  format: BannerFormat
): Promise<{ fallbackId: string; codeHtml: string } | null> {
  const { data } = await supabase.rpc('get_banner_fallback', {
    p_zone_id: zoneId,
    p_position: position,
    p_format: format,
  });

  if (data && data.length > 0) {
    return {
      fallbackId: data[0].fallback_id,
      codeHtml: data[0].code_html,
    };
  }
  return null;
}

/**
 * Check if a slot is available for a given date range.
 */
export async function checkAvailability(
  zoneId: string,
  position: BannerPosition,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<boolean> {
  const { data } = await supabase.rpc('check_slot_availability', {
    p_zone_id: zoneId,
    p_position: position,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_booking_id: excludeBookingId || null,
  });
  return !!data;
}

/**
 * Get occupied date ranges for a slot (for the calendar UI).
 */
export async function getOccupiedDates(
  zoneId: string,
  position: BannerPosition,
  fromDate?: string,
  toDate?: string
): Promise<{
  bookingId: string;
  startDate: string;
  endDate: string;
  username: string;
  avatarUrl: string | null;
  status: string;
}[]> {
  const { data } = await supabase.rpc('get_occupied_dates', {
    p_zone_id: zoneId,
    p_position: position,
    p_from_date: fromDate || new Date().toISOString().split('T')[0],
    p_to_date: toDate || undefined,
  });

  if (!data) return [];

  return data.map((row: { booking_id: string; start_date: string; end_date: string; username: string; avatar_url: string | null; status: string }) => ({
    bookingId: row.booking_id,
    startDate: row.start_date,
    endDate: row.end_date,
    username: row.username,
    avatarUrl: row.avatar_url,
    status: row.status,
  }));
}

/**
 * Get all zones for a specific country (for the purchase flow).
 */
export async function getZonesForCountry(countryId: string): Promise<BannerAdZone[]> {
  const { data } = await supabase
    .from('banner_ad_zones')
    .select('*, country:countries(id, name, slug, flag_emoji), region:regions(id, name, slug)')
    .eq('country_id', countryId)
    .eq('is_active', true)
    .order('zone_type')
    .order('name');

  return data || [];
}

/**
 * Get all zones grouped by country (for admin).
 */
export async function getAllZones(): Promise<BannerAdZone[]> {
  const { data } = await supabase
    .from('banner_ad_zones')
    .select('*, country:countries(id, name, slug, flag_emoji), region:regions(id, name, slug)')
    .eq('is_active', true)
    .order('name');

  return data || [];
}

/**
 * Track a banner impression or click.
 */
export async function trackBannerEvent(
  eventType: 'impression' | 'click',
  opts: {
    bookingId?: string;
    fallbackId?: string;
    zoneId?: string;
    position?: string;
  }
): Promise<void> {
  await supabase.from('banner_impressions').insert({
    event_type: eventType,
    booking_id: opts.bookingId || null,
    fallback_id: opts.fallbackId || null,
    zone_id: opts.zoneId || null,
    position: opts.position || null,
  });
}
