import { Metadata } from 'next';

type GenerateMetadataProps = {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  url?: string;
  noIndex?: boolean;
};

export const SITE_NAME = 'TransForo';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://transforo.com';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_DESCRIPTION = 'The leading trans community forum — reviews, ratings, discussions and connections. Join thousands of members worldwide.';
export const DEFAULT_KEYWORDS = [
  'trans forum', 'ts community', 'trans reviews', 'ts ratings',
  'trans discussion', 'trans escort forum', 'ts escort reviews',
  'transgender community', 'trans meetup', 'ts forum',
  'trans services', 'ts directory', 'trans profiles',
  'foro trans', 'comunidad trans', 'reseñas trans',
];

export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  type = 'website',
  url,
  noIndex = false,
}: GenerateMetadataProps = {}): Metadata {
  const fullTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return {
    title: fullTitle,
    description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    keywords: DEFAULT_KEYWORDS,
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
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
      locale: 'es_ES',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@transforo',
      site: '@transforo',
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
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
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
}) {
  const description = `Thread by @${thread.author?.username || 'User'} — ${thread.replies_count || 0} replies, ${thread.views_count || 0} views. ${thread.title}`.slice(0, 160);
  
  return generateMetadata({
    title: thread.title,
    description,
    type: 'article',
    url: thread.id ? `/hilo/${thread.id}` : undefined,
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
    url: `/usuaria/${profile.username}`,
  });
}
