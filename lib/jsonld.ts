import { SITE_NAME, SITE_URL } from '@/lib/metadata';

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Foro de escorts trans, travestis y shemales — reseñas, opiniones, fotos verificadas y experiencias reales.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    sameAs: [],
  };
}

export function discussionForumPostingJsonLd(thread: {
  id: string;
  title: string;
  content?: string;
  author_username: string;
  created_at: string;
  replies_count: number;
  views_count: number;
  tag?: string;
  url?: string;
}) {
  const threadUrl = thread.url || `${SITE_URL}/hilo/${thread.id}`;
  const tagLabel = thread.tag === 'review' ? 'Review' : thread.tag === 'ask' ? 'Question' : thread.tag === 'general' ? 'Discussion' : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': threadUrl,
    headline: thread.title,
    text: thread.content?.slice(0, 300) || thread.title,
    url: threadUrl,
    datePublished: thread.created_at,
    ...(tagLabel && { keywords: tagLabel }),
    ...(tagLabel && { articleSection: tagLabel }),
    author: {
      '@type': 'Person',
      name: thread.author_username,
      url: `${SITE_URL}/user/${thread.author_username}`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: thread.replies_count,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: thread.views_count,
      },
    ],
    isPartOf: {
      '@type': 'DiscussionForum',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function profileJsonLd(profile: {
  username: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.username,
    url: `${SITE_URL}/user/${profile.username}`,
    description: profile.bio || undefined,
    image: profile.avatar_url || undefined,
    memberOf: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };
}
