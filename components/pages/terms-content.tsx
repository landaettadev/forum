'use client';

import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { FileText } from 'lucide-react';

export function TermsContent() {
  const t = useTranslations('termsPage');

  const renderItems = (key: string) =>
    t(key).split('|').map((item, i) => <li key={i}>{item}</li>);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1">
      <Breadcrumbs items={[{ label: t('breadcrumb') }]} />

      <div className="forum-surface p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>

        <p className="forum-text-muted mb-6">
          {t('lastUpdate')}: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-6 forum-text-secondary">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s1t')}</h2>
            <p>{t('s1p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s2t')}</h2>
            <p className="mb-2">{t('s2p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s2items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s3t')}</h2>
            <p className="mb-2">{t('s3p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s3items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s4t')}</h2>
            <p className="mb-2">{t('s4p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s4items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s5t')}</h2>
            <p className="mb-2">{t('s5p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s5items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s6t')}</h2>
            <p>{t('s6p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s7t')}</h2>
            <p className="mb-2">{t('s7p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s7items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s8t')}</h2>
            <p>{t('s8p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s9t')}</h2>
            <p className="mb-2">{t('s9p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s9items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s10t')}</h2>
            <p>{t('s10p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s11t')}</h2>
            <p>{t('s11p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s12t')}</h2>
            <p>{t('s12p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s13t')}</h2>
            <p>{t('s13p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s14t')}</h2>
            <p>{t('s14p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s15t')}</h2>
            <p>{t('s15p')} <a href="/contacto" className="text-[hsl(var(--forum-link))] hover:underline">{t('s15link')}</a>.</p>
          </section>

          <div className="mt-8 p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
            <p className="text-sm">{t('acceptanceNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
