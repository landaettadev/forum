'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">
            {t('somethingWentWrong')}
          </h1>

          <p className="text-lg forum-text-secondary mb-8">
            {t('unexpectedError')}
          </p>

          {error.digest && (
            <div className="mb-8 p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
              <p className="text-xs forum-text-muted">
                {t('errorId')}: <code className="font-mono">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={reset}
              className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('tryAgain')}
            </Button>

            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                {t('backHome')}
              </Link>
            </Button>
          </div>

          <div className="mt-12 p-6 forum-surface rounded-lg border border-[hsl(var(--forum-border))]">
            <h3 className="font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">
              {t('needHelp')}
            </h3>
            <p className="text-sm forum-text-secondary mb-4">
              {t('problemPersists')}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-[hsl(var(--forum-accent))]">1.</span>
                <span className="text-left">
                  {t('step1')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[hsl(var(--forum-accent))]">2.</span>
                <span className="text-left">
                  {t('step2')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[hsl(var(--forum-accent))]">3.</span>
                <span className="text-left">
                  <Link href="/contacto" className="text-[hsl(var(--forum-link))] hover:underline">
                    {t('contactSupport')}
                  </Link>
                  {' '}{t('includeErrorId')}
                </span>
              </div>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm font-semibold mb-2 text-red-500">
                {t('devErrorDetails')}
              </summary>
              <pre className="text-xs bg-[hsl(var(--forum-surface-alt))] p-4 rounded overflow-auto max-h-64 text-left">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
