'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function CookieBanner() {
  const t = useTranslations('cookies');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[hsl(var(--forum-surface))] border-t-2 border-[hsl(var(--forum-accent))] shadow-lg backdrop-blur-lg bg-opacity-95">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-4">
          <Cookie className="h-6 w-6 text-[hsl(var(--forum-accent))] flex-shrink-0 mt-1" />
          
          <div className="flex-1">
            <h3 className="font-semibold mb-2 text-[hsl(var(--forum-text-primary))]">
              🍪 {t('title')}
            </h3>
            <p className="text-sm forum-text-secondary mb-3">
              {t('description')}
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                onClick={acceptCookies}
                className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white"
                size="sm"
              >
                {t('acceptAll')}
              </Button>
              <Button
                onClick={rejectCookies}
                variant="outline"
                size="sm"
              >
                {t('essentialOnly')}
              </Button>
              <Link
                href="/cookies"
                className="text-sm text-[hsl(var(--forum-link))] hover:underline"
              >
                {t('moreInfo')}
              </Link>
              <Link
                href="/privacidad"
                className="text-sm text-[hsl(var(--forum-link))] hover:underline"
              >
                {t('privacyPolicy')}
              </Link>
            </div>
          </div>

          <button
            onClick={rejectCookies}
            className="forum-text-muted hover:text-[hsl(var(--forum-text-primary))] flex-shrink-0"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
