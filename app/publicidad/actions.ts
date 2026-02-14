'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { getPrice, calculateEndDate, getMinStartDate, DURATION_OPTIONS } from '@/lib/banner-pricing';
import type { DurationOption } from '@/lib/banner-pricing';
import type { BannerPosition, BannerFormat } from '@/lib/supabase';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_POSITIONS: BannerPosition[] = ['header', 'sidebar_top', 'sidebar_bottom', 'footer', 'content'];
const VALID_FORMATS: BannerFormat[] = ['728x90', '300x250'];

export async function createBannerBooking(formData: {
  countryId: string;
  zoneType: string;
  regionId?: string;
  position: string;
  format: string;
  startDate: string;
  durationDays: number;
  imageUrl: string;
  clickUrl?: string;
}): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const supabase = createServerSupabaseClient();

    // 1. Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'AUTH_REQUIRED' };
    }

    // 2. Check suspension
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single();
    if (profile?.is_suspended) {
      return { success: false, error: 'Tu cuenta está suspendida.' };
    }

    // 3. Validate inputs
    const position = formData.position as BannerPosition;
    const format = formData.format as BannerFormat;
    const durationDays = formData.durationDays as DurationOption;
    const zoneType = formData.zoneType as 'home_country' | 'city';

    if (!VALID_POSITIONS.includes(position)) {
      return { success: false, error: 'Posición de banner inválida.' };
    }
    if (!VALID_FORMATS.includes(format)) {
      return { success: false, error: 'Formato de banner inválido.' };
    }
    if (!DURATION_OPTIONS.includes(durationDays)) {
      return { success: false, error: 'Duración inválida.' };
    }
    if (!formData.imageUrl) {
      return { success: false, error: 'Debes subir una imagen para el banner.' };
    }
    if (!['home_country', 'city'].includes(zoneType)) {
      return { success: false, error: 'Tipo de zona inválido.' };
    }

    // 4. Find or create zone
    let zoneQuery = supabase
      .from('banner_ad_zones')
      .select('id, zone_type, is_active')
      .eq('country_id', formData.countryId)
      .eq('zone_type', zoneType)
      .eq('is_active', true);

    if (zoneType === 'city' && formData.regionId) {
      zoneQuery = zoneQuery.eq('region_id', formData.regionId);
    } else {
      zoneQuery = zoneQuery.is('region_id', null);
    }

    let { data: zone } = await zoneQuery.maybeSingle();

    // Auto-create the zone if it doesn't exist
    if (!zone) {
      const { data: country } = await supabase
        .from('countries')
        .select('name')
        .eq('id', formData.countryId)
        .single();

      let zoneName = country?.name || 'Unknown';
      if (zoneType === 'city' && formData.regionId) {
        const { data: region } = await supabase
          .from('regions')
          .select('name')
          .eq('id', formData.regionId)
          .single();
        zoneName = `${region?.name || 'Unknown'} - ${zoneName}`;
      }

      const { data: newZone, error: createZoneError } = await supabase
        .from('banner_ad_zones')
        .insert({
          name: zoneName,
          zone_type: zoneType,
          country_id: formData.countryId,
          region_id: zoneType === 'city' ? formData.regionId || null : null,
          is_active: true,
        })
        .select('id, zone_type, is_active')
        .single();

      if (createZoneError || !newZone) {
        console.error('Error creating zone:', createZoneError);
        return { success: false, error: 'Error al crear la zona publicitaria. Asegúrate de que las migraciones de base de datos se hayan ejecutado.' };
      }
      zone = newZone;
    }

    // 5. Validate start date (min 3 days from now)
    const startDate = new Date(formData.startDate);
    const minDate = getMinStartDate();
    startDate.setHours(0, 0, 0, 0);

    if (startDate < minDate) {
      return { success: false, error: 'La fecha de inicio debe ser al menos 3 días desde hoy.' };
    }

    // 6. Calculate end date and price
    const endDate = calculateEndDate(startDate, durationDays);
    const price = getPrice(zoneType, durationDays);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // 7. Check availability (graceful — RPC may not exist)
    try {
      const { data: available } = await supabase.rpc('check_slot_availability', {
        p_zone_id: zone.id,
        p_position: position,
        p_start_date: startStr,
        p_end_date: endStr,
      });

      if (available === false) {
        return { success: false, error: 'Este espacio ya está reservado para las fechas seleccionadas.' };
      }
    } catch {
      // RPC may not exist yet — skip availability check
    }

    // 8. Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('banner_bookings')
      .insert({
        user_id: user.id,
        zone_id: zone.id,
        position,
        format,
        image_url: formData.imageUrl,
        click_url: formData.clickUrl || null,
        start_date: startStr,
        end_date: endStr,
        duration_days: durationDays,
        price_usd: price,
        status: 'pending',
      })
      .select('id')
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return { success: false, error: 'Error al crear la reserva.' };
    }

    revalidatePath('/admin/ads');
    revalidatePath('/publicidad');

    return { success: true, data: { bookingId: booking.id } };
  } catch (error) {
    console.error('Unexpected error in createBannerBooking:', error);
    return { success: false, error: 'Error inesperado.' };
  }
}
