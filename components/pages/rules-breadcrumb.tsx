'use client';

import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export function RulesBreadcrumb() {
  const t = useTranslations('rules');

  return <Breadcrumbs items={[{ label: t('title') }]} />;
}
