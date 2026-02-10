import { Metadata } from 'next';

type GenerateMetadataProps = {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  url?: string;
  noIndex?: boolean;
};

const SITE_NAME = 'TransForo';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://transforo.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION = 'Foro profesional para chicas trans de servicios. Comparte experiencias, tips y conecta con colegas de tu zona.';

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
    keywords: ['foro trans', 'comunidad trans', 'profesionales trans', 'servicios', 'escorts trans', 'trans forum'],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: fullUrl,
      languages: {
        'es': `${SITE_URL}/es${url || ''}`,
        'en': `${SITE_URL}/en${url || ''}`,
        'pt': `${SITE_URL}/pt${url || ''}`,
        'fr': `${SITE_URL}/fr${url || ''}`,
      },
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
  title: string;
  author?: { username: string };
  created_at: string;
  views_count?: number;
  replies_count?: number;
}) {
  const description = `Hilo por @${thread.author?.username || 'Usuario'} - ${thread.replies_count || 0} respuestas, ${thread.views_count || 0} vistas`;
  
  return generateMetadata({
    title: thread.title,
    description,
    type: 'article',
  });
}

export function generateForumMetadata(forum: {
  name: string;
  description?: string;
  threads_count?: number;
  posts_count?: number;
}) {
  const description = forum.description || `${forum.name} - ${forum.threads_count || 0} hilos, ${forum.posts_count || 0} posts`;
  
  return generateMetadata({
    title: forum.name,
    description,
  });
}

export function generateProfileMetadata(profile: {
  username: string;
  bio?: string;
  avatar_url?: string;
  posts_count?: number;
}) {
  const description = profile.bio || `Perfil de @${profile.username} - ${profile.posts_count || 0} posts en TransForo`;
  
  return generateMetadata({
    title: `@${profile.username}`,
    description,
    image: profile.avatar_url || DEFAULT_IMAGE,
    type: 'profile',
  });
}
