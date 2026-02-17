/**
 * Sistema de precios para banners publicitarios
 */

import type { BannerFormat, BannerPosition } from './supabase';

export type DurationOption = 7 | 15 | 30 | 90 | 180;

export const DURATION_OPTIONS: DurationOption[] = [7, 15, 30, 90, 180];

// Precios para banners de Ciudad/Región (subforos) — incremento de $5
const CITY_PRICES: Record<DurationOption, number> = {
  7: 5,
  15: 10,
  30: 15,
  90: 20,
  180: 25,
};

// Precios para banners de Home/País — incremento de $10
const HOME_COUNTRY_PRICES: Record<DurationOption, number> = {
  7: 10,
  15: 20,
  30: 30,
  90: 40,
  180: 50,
};

export function getPrice(zoneType: 'home_country' | 'city', duration: DurationOption): number {
  if (zoneType === 'home_country') {
    return HOME_COUNTRY_PRICES[duration];
  }
  return CITY_PRICES[duration];
}

export function getPriceTable(zoneType: 'home_country' | 'city'): { duration: DurationOption; price: number }[] {
  return DURATION_OPTIONS.map(d => ({
    duration: d,
    price: getPrice(zoneType, d),
  }));
}

// Formatos de banner con sus dimensiones y posiciones válidas
export const BANNER_FORMATS: {
  format: BannerFormat;
  width: number;
  height: number;
  label: string;
  positions: BannerPosition[];
}[] = [
  {
    format: '728x90',
    width: 728,
    height: 90,
    label: 'Leaderboard (728×90)',
    positions: ['header', 'content', 'before_related', 'footer'],
  },
  {
    format: '300x250',
    width: 300,
    height: 250,
    label: 'Medium Rectangle (300×250)',
    positions: ['sidebar_top', 'sidebar_bottom'],
  },
];

export const POSITION_LABELS: Record<BannerPosition, string> = {
  header: '① Header — Barra superior de cada página',
  content: '② Contenido — Debajo del título, encima de los posts',
  sidebar_top: '③ Sidebar Superior — Lateral derecho, arriba',
  sidebar_bottom: '④ Sidebar Inferior — Lateral derecho, abajo',
  before_related: '⑤ Pre-Related — Entre respuestas y discusiones relacionadas',
  footer: '⑥ Footer — Parte inferior de cada página',
};

export const POSITION_DESCRIPTIONS: Record<BannerPosition, string> = {
  header: 'Visible en todas las páginas. Máxima exposición.',
  content: 'Visible en hilos entre el título y los comentarios. Alto engagement.',
  sidebar_top: 'Visible en PC al lado derecho, arriba. Solo escritorio.',
  sidebar_bottom: 'Visible en PC al lado derecho, abajo. Solo escritorio.',
  before_related: 'Visible en hilos entre las respuestas y las discusiones relacionadas. Alto engagement.',
  footer: 'Visible en todas las páginas al final. Complementario.',
};

export const POSITION_VISIBILITY: Record<BannerPosition, { pc: boolean; mobile: boolean }> = {
  header: { pc: true, mobile: true },
  content: { pc: true, mobile: true },
  sidebar_top: { pc: true, mobile: false },
  sidebar_bottom: { pc: true, mobile: false },
  before_related: { pc: true, mobile: true },
  footer: { pc: true, mobile: true },
};

export function getFormatForPosition(position: BannerPosition): BannerFormat {
  const fmt = BANNER_FORMATS.find(f => f.positions.includes(position));
  return fmt?.format || '728x90';
}

export function getDimensionsForFormat(format: BannerFormat): { width: number; height: number } {
  const fmt = BANNER_FORMATS.find(f => f.format === format);
  return fmt ? { width: fmt.width, height: fmt.height } : { width: 728, height: 90 };
}

// Mínimo 3 días antes de la fecha de inicio
export const MIN_DAYS_ADVANCE = 3;

export function getMinStartDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + MIN_DAYS_ADVANCE);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function calculateEndDate(startDate: Date, durationDays: DurationOption): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays - 1);
  return end;
}
