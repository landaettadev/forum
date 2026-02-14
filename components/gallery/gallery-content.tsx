'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Image as ImageIcon, Eye, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

type MediaItem = {
  id: string;
  title: string | null;
  url: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

interface GalleryContentProps {
  media: MediaItem[];
}

export function GalleryContent({ media }: GalleryContentProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('gallery');

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <ImageIcon className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
          {t('title')}
        </h1>
        <p className="forum-text-secondary">
          {t('description')}
        </p>
      </div>

      {media && media.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))]"
            >
              <Image
                src={item.thumbnail_url || item.url}
                alt={item.title || ''}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {item.title && (
                    <p className="text-white text-sm font-medium truncate">
                      {item.title}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
                    <Link
                      href={`/user/${item.user.username}`}
                      className="hover:text-white"
                    >
                      @{item.user.username}
                    </Link>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.views_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="forum-surface p-12 text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 forum-text-muted opacity-50" />
          <h2 className="text-xl font-semibold mb-2">{t('noImages')}</h2>
          <p className="forum-text-secondary">
            {t('noImagesDesc')}
          </p>
        </div>
      )}
    </>
  );
}
