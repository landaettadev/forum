'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BackButton() {
  const t = useTranslations('common');
  return (
    <button
      onClick={() => window.history.back()}
      className="mt-6 inline-flex items-center text-sm text-[hsl(var(--forum-link))] hover:underline"
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      {t('backToPreviousPage')}
    </button>
  );
}
