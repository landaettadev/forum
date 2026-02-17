import type { Metadata } from 'next';
import { locales, defaultLocale, type Locale } from '@/i18n';

type GenerateMetadataProps = {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  url?: string;
  noIndex?: boolean;
  locale?: Locale;
};

// Locale-specific site titles
const SITE_TITLES: Record<Locale, string> = {
  es: 'TS Rating — Reseñas Escorts Trans y Travestis',
  en: 'TS Rating — Trans Escort Reviews & Ratings',
  pt: 'TS Rating — Avaliações Acompanhantes Trans',
  fr: 'TS Rating — Avis Escorts Trans et Travestis',
  de: 'TS Rating — Trans Escort Bewertungen',
  it: 'TS Rating — Recensioni Escort Trans',
  nl: 'TS Rating — Trans Escort Reviews & Beoordelingen',
  ja: 'TS Rating — ニューハーフレビュー・評価',
  zh: 'TS Rating — 跨性别伴游评论与评价',
  ru: 'TS Rating — Отзывы и Рейтинги Транс Эскорт',
  ar: 'TS Rating — مراجعات مرافقات ترانس',
  hi: 'TS Rating — ट्रांस एस्कॉर्ट रिव्यू और रेटिंग',
  ko: 'TS Rating — 트랜스 에스코트 리뷰 및 평가',
  tr: 'TS Rating — Trans Eskort Yorumları ve Değerlendirmeleri',
  pl: 'TS Rating — Recenzje i Oceny Trans Escort',
  sv: 'TS Rating — Trans Escort Recensioner & Betyg',
  id: 'TS Rating — Ulasan & Rating Escort Trans',
  th: 'TS Rating — รีวิวและเรตติ้งเอสคอร์ทข้ามเพศ',
};

// Locale-specific descriptions
const SITE_DESCRIPTIONS: Record<Locale, string> = {
  es: 'Foro #1 de reseñas de escorts trans, travestis y shemales. Reviews verificadas, opiniones de catadores, fotos reales y experiencias actualizadas 2026.',
  en: '#1 Forum for trans escort and shemale reviews. Verified reviews, opinions, real photos and updated experiences 2026.',
  pt: 'Fórum #1 de avaliações de acompanhantes trans e travestis. Reviews verificados, opiniões, fotos reais 2026.',
  fr: 'Forum #1 pour les avis sur les escorts trans et travestis. Avis vérifiés, opinions, photos réelles 2026.',
  de: '#1 Forum für Trans Escort und Shemale Bewertungen. Verifizierte Reviews, Meinungen, echte Fotos 2026.',
  it: 'Forum #1 per recensioni di escort trans e shemale. Recensioni verificate, opinioni, foto reali 2026.',
  nl: '#1 Forum voor trans escort en shemale reviews. Geverifieerde reviews, meningen, echte fotos 2026.',
  ja: 'ニューハーフ・シーメールのレビューフォーラム #1。認証レビュー、評価、リアル写真 2026年。',
  zh: '#1 跨性别伴游评论论坛。认证评论、意见、真实照片 2026年。',
  ru: '#1 Форум отзывов о транс эскорт и шимейл. Проверенные отзывы, мнения, реальные фото 2026.',
  ar: 'المنتدى #1 لمراجعات مرافقات ترانس. مراجعات موثقة، آراء، صور حقيقية 2026.',
  hi: 'ट्रांस एस्कॉर्ट और शीमेल रिव्यू के लिए #1 फोरम। सत्यापित रिव्यू, राय, असली फोटो 2026।',
  ko: '트랜스 에스코트 및 쉬메일 리뷰 #1 포럼. 인증된 리뷰, 의견, 실제 사진 2026.',
  tr: '#1 Trans eskort ve shemale yorumları forumu. Doğrulanmış yorumlar, görüşler, gerçek fotoğraflar 2026.',
  pl: '#1 Forum recenzji trans escort i shemale. Zweryfikowane recenzje, opinie, prawdziwe zdjęcia 2026.',
  sv: '#1 Forum för trans escort och shemale recensioner. Verifierade recensioner, åsikter, riktiga foton 2026.',
  id: 'Forum #1 untuk ulasan escort trans dan shemale. Ulasan terverifikasi, pendapat, foto asli 2026.',
  th: 'ฟอรั่ม #1 สำหรับรีวิวเอสคอร์ทข้ามเพศและเลดี้บอย รีวิวที่ยืนยัน ความคิดเห็น รูปจริง 2026',
};

// Locale to OpenGraph locale mapping
const OG_LOCALES: Record<Locale, string> = {
  es: 'es_ES',
  en: 'en_US',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  nl: 'nl_NL',
  ja: 'ja_JP',
  zh: 'zh_CN',
  ru: 'ru_RU',
  ar: 'ar_SA',
  hi: 'hi_IN',
  ko: 'ko_KR',
  tr: 'tr_TR',
  pl: 'pl_PL',
  sv: 'sv_SE',
  id: 'id_ID',
  th: 'th_TH',
};

export function getSiteTitle(locale: Locale = defaultLocale): string {
  return SITE_TITLES[locale] || SITE_TITLES[defaultLocale];
}

export function getSiteDescription(locale: Locale = defaultLocale): string {
  return SITE_DESCRIPTIONS[locale] || SITE_DESCRIPTIONS[defaultLocale];
}

export function getOgLocale(locale: Locale = defaultLocale): string {
  return OG_LOCALES[locale] || OG_LOCALES[defaultLocale];
}

export const SITE_NAME = 'TS Rating';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsrating.com';
export const DEFAULT_IMAGE = `${SITE_URL}/opengraph-image`;
// Legacy exports for backward compatibility
export const SITE_TITLE = SITE_TITLES[defaultLocale];
export const DEFAULT_DESCRIPTION = SITE_DESCRIPTIONS[defaultLocale];
// Base keywords (multilingual for global reach)
const BASE_KEYWORDS = [
  'trans escort reviews', 'shemale reviews', 'ts reviews', 'ladyboy reviews',
  'transgender escort forum', 'trans escort ratings', 'ts escort directory',
];

// Locale-specific keywords for SEO
const LOCALE_KEYWORDS: Record<Locale, string[]> = {
  es: [
    'reseñas escorts trans', 'opiniones escorts trans', 'escorts trans verificadas',
    'foro escorts trans', 'foro travestis', 'foro shemales', 'travesti reseñas',
    'escorts trans colombia', 'escorts trans mexico', 'escorts trans argentina',
    'escorts trans españa', 'mejores escorts trans', 'escort trans cerca de mi',
  ],
  en: [
    'trans escort reviews', 'shemale escort reviews', 'ts escort forum',
    'verified trans escorts', 'trans escort ratings', 'shemale reviews usa',
    'trans escort uk', 'best trans escorts', 'real trans escort experiences',
  ],
  pt: [
    'avaliações acompanhantes trans', 'opiniões travestis', 'fórum trans brasil',
    'acompanhantes trans verificadas', 'reviews travestis', 'experiências trans',
  ],
  fr: [
    'avis escorts trans', 'forum escorts trans', 'escort trans paris',
    'escort trans france', 'shemale france', 'trans escort avis',
  ],
  de: [
    'trans escort bewertungen', 'shemale escort deutschland', 'ts escort forum',
    'trans escort berlin', 'trans escort münchen', 'transsexuelle escort',
  ],
  it: [
    'recensioni escort trans', 'forum escort trans', 'escort trans italia',
    'escort trans roma', 'escort trans milano', 'shemale escort italia',
  ],
  nl: [
    'trans escort reviews nederland', 'shemale escort amsterdam',
    'trans escort forum', 'ts escort nederland',
  ],
  ja: [
    'ニューハーフ レビュー', 'シーメール 評価', 'ニューハーフ フォーラム',
    'ニューハーフ 東京', 'ニューハーフ 大阪',
  ],
  zh: [
    '跨性别伴游评论', '伪娘评价', '变性人伴游', '跨性别论坛',
  ],
  ru: [
    'отзывы транс эскорт', 'шимейл отзывы', 'форум транс эскорт',
    'транс эскорт москва', 'транс эскорт россия',
  ],
  ar: [
    'مراجعات مرافقات ترانس', 'منتدى ترانس', 'شيميل عربي',
  ],
  hi: [
    'ट्रांस एस्कॉर्ट रिव्यू', 'शीमेल रिव्यू', 'ट्रांस फोरम',
  ],
  ko: [
    '트랜스 에스코트 리뷰', '쉬메일 리뷰', '트랜스 포럼',
  ],
  tr: [
    'trans eskort yorumları', 'shemale escort türkiye', 'trans eskort istanbul',
  ],
  pl: [
    'trans escort opinie', 'shemale escort polska', 'trans escort warszawa',
  ],
  sv: [
    'trans escort recensioner', 'shemale escort sverige', 'trans escort stockholm',
  ],
  id: [
    'ulasan escort trans', 'shemale indonesia', 'trans escort jakarta',
  ],
  th: [
    'รีวิวเอสคอร์ทข้ามเพศ', 'เลดี้บอย รีวิว', 'ฟอรั่มกระเทย',
  ],
};

export function getKeywords(locale: Locale = defaultLocale): string[] {
  return [...BASE_KEYWORDS, ...(LOCALE_KEYWORDS[locale] || LOCALE_KEYWORDS[defaultLocale])];
}

// Legacy export for backward compatibility
export const DEFAULT_KEYWORDS = [...BASE_KEYWORDS, ...LOCALE_KEYWORDS[defaultLocale]];

export function generateMetadata({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = 'website',
  url,
  noIndex = false,
  locale = defaultLocale,
}: GenerateMetadataProps = {}): Metadata {
  const localeSiteTitle = getSiteTitle(locale);
  const localeDescription = description || getSiteDescription(locale);
  const fullTitle = title ? `${title} | ${SITE_NAME}` : localeSiteTitle;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const ogLocale = getOgLocale(locale);

  return {
    title: fullTitle,
    description: localeDescription,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    keywords: getKeywords(locale),
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: fullUrl,
      languages: Object.fromEntries([
        ...locales.map((l) => [l, fullUrl]),
        ['x-default', fullUrl],
      ]),
    },
    openGraph: {
      title: fullTitle,
      description: localeDescription,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: ogLocale,
      alternateLocale: locales.filter(l => l !== locale).map(l => OG_LOCALES[l]),
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: localeDescription,
      images: [image],
      creator: '@tsrating',
      site: '@tsrating',
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.json',
  };
}

export function generateThreadMetadata(thread: {
  id?: string;
  title: string;
  author?: { username: string };
  created_at: string;
  views_count?: number;
  replies_count?: number;
  region_name?: string;
  country_name?: string;
  tag?: string;
  slug?: string | null;
  canonicalUrl?: string;
}) {
  const location = thread.region_name
    ? thread.country_name
      ? `${thread.region_name}, ${thread.country_name}`
      : thread.region_name
    : undefined;
  const seoTitle = location ? `${thread.title} - ${location}` : thread.title;

  const tagLabel = thread.tag === 'review' ? 'Review' : thread.tag === 'ask' ? 'Question' : '';
  const description = `${tagLabel ? `[${tagLabel}] ` : ''}${thread.title}${location ? ` in ${location}` : ''} — ${thread.replies_count || 0} replies, ${thread.views_count || 0} views. By @${thread.author?.username || 'User'} on ${SITE_NAME}.`.slice(0, 160);

  const url = thread.canonicalUrl || (thread.id ? `/hilo/${thread.id}` : undefined);

  return generateMetadata({
    title: seoTitle,
    description,
    type: 'article',
    url,
  });
}

export function generateForumMetadata(forum: {
  name: string;
  slug?: string;
  description?: string;
  threads_count?: number;
  posts_count?: number;
}) {
  const description = forum.description || `${forum.name} — ${forum.threads_count || 0} threads, ${forum.posts_count || 0} posts on ${SITE_NAME}`;
  
  return generateMetadata({
    title: forum.name,
    description,
    url: forum.slug ? `/foro/${forum.slug}` : undefined,
  });
}

export function generateProfileMetadata(profile: {
  username: string;
  bio?: string;
  avatar_url?: string;
  posts_count?: number;
}) {
  const description = profile.bio || `@${profile.username} profile — ${profile.posts_count || 0} posts on ${SITE_NAME}`;
  
  return generateMetadata({
    title: `@${profile.username}`,
    description,
    image: profile.avatar_url || DEFAULT_IMAGE,
    type: 'profile',
    url: `/user/${profile.username}`,
  });
}
