import type { Locale } from 'date-fns';
import {
  ar,
  de,
  enUS,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  sv,
  th,
  tr,
  zhCN,
} from 'date-fns/locale';

const localeMap: Record<string, Locale> = {
  ar,
  de,
  en: enUS,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  sv,
  th,
  tr,
  zh: zhCN,
};

export const getDateFnsLocale = (locale: string): Locale => localeMap[locale] ?? enUS;
