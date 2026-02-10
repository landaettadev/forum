'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';
import { Home, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function NotFoundContent() {
  const t = useTranslations('notFound');

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] bg-clip-text text-transparent">
            404
          </h1>
        </div>

        <h2 className="text-3xl font-bold mb-4">
          {t('title')}
        </h2>

        <p className="text-lg forum-text-secondary mb-8">
          {t('description')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t('goHome')}
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/buscar">
              <Search className="h-4 w-4 mr-2" />
              {t('searchForum')}
            </Link>
          </Button>
        </div>

        <div className="mt-12 p-6 forum-surface rounded-lg border border-[hsl(var(--forum-border))]">
          <h3 className="font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">
            {t('needHelp')}
          </h3>
          <p className="text-sm forum-text-secondary mb-4">
            {t('helpDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <Link href="/contacto" className="text-[hsl(var(--forum-link))] hover:underline">
              {t('contactSupport')}
            </Link>
            <span className="hidden sm:inline forum-text-muted">•</span>
            <Link href="/faq" className="text-[hsl(var(--forum-link))] hover:underline">
              {t('viewFaq')}
            </Link>
            <span className="hidden sm:inline forum-text-muted">•</span>
            <Link href="/reglas" className="text-[hsl(var(--forum-link))] hover:underline">
              {t('readRules')}
            </Link>
          </div>
        </div>

        <BackButton />
      </div>
    </div>
  );
}
