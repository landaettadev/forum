'use client';

import Link from 'next/link';
import { Folder, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Category, Forum } from '@/lib/supabase';

type CategoryRowProps = {
  category: Category;
  forums: Forum[];
};

export function CategoryRow({ category, forums }: CategoryRowProps) {
  const tForum = useTranslations('forum');

  const _totalThreads = forums.reduce((sum, forum) => sum + forum.threads_count, 0);
  const _totalPosts = forums.reduce((sum, forum) => sum + forum.posts_count, 0);

  return (
    <div className="forum-surface mb-4">
      <div className="bg-[hsl(var(--forum-surface-alt))] px-4 py-3 border-b border-[hsl(var(--forum-border))]">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
          <h2 className="font-semibold text-lg">{category.name}</h2>
          {category.description && (
            <span className="forum-text-muted text-sm ml-2">{category.description}</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-[hsl(var(--forum-border))]">
        {forums.length === 0 ? (
          <div className="p-4 text-center forum-text-muted">
            {tForum('noSubforums')}
          </div>
        ) : (
          forums.map((forum) => (
            <Link
              key={forum.id}
              href={`/foro/${forum.slug}`}
              className="block p-4 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    <Folder className="h-5 w-5 text-[hsl(var(--forum-text-muted))]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold hover:text-[hsl(var(--forum-accent))]">
                        {forum.name}
                      </h3>
                      {forum.is_private && (
                        <span className="text-xs px-2 py-0.5 bg-[hsl(var(--forum-accent-muted))] text-[hsl(var(--forum-accent))] rounded">
                          {tForum('private')}
                        </span>
                      )}
                    </div>
                    {forum.description && (
                      <p className="text-sm forum-text-secondary mt-1">{forum.description}</p>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-sm font-semibold">{forum.threads_count}</div>
                  <div className="text-xs forum-text-muted">{tForum('threads')}</div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-semibold">{forum.posts_count}</div>
                  <div className="text-xs forum-text-muted">{tForum('posts')}</div>
                </div>
                <div className="ml-4">
                  <ChevronRight className="h-5 w-5 forum-text-muted" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
