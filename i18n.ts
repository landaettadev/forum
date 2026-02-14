import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['es', 'en', 'pt', 'fr', 'de', 'it', 'nl', 'ja', 'zh', 'ru', 'ar', 'hi', 'ko', 'tr', 'pl', 'sv', 'id', 'th'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = rawLocale && (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
