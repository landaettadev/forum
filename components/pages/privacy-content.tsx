'use client';

import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Shield } from 'lucide-react';

export function PrivacyContent() {
  const t = useTranslations('privacyPage');

  const renderItems = (key: string) =>
    t(key).split('|').map((item, i) => <li key={i}>{item}</li>);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1">
      <Breadcrumbs items={[{ label: t('breadcrumb') }]} />

      <div className="forum-surface p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
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
            <h3 className="text-xl font-semibold mb-2 mt-4 text-[hsl(var(--forum-text-primary))]">{t('s21t')}</h3>
            <p className="mb-2">{t('s21p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s21i1')}</li><li>{t('s21i2')}</li><li>{t('s21i3')}</li><li>{t('s21i4')}</li>
            </ul>
            <h3 className="text-xl font-semibold mb-2 mt-4 text-[hsl(var(--forum-text-primary))]">{t('s22t')}</h3>
            <p className="mb-2">{t('s22p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s22i1')}</li><li>{t('s22i2')}</li><li>{t('s22i3')}</li><li>{t('s22i4')}</li><li>{t('s22i5')}</li>
            </ul>
            <h3 className="text-xl font-semibold mb-2 mt-4 text-[hsl(var(--forum-text-primary))]">{t('s23t')}</h3>
            <p className="mb-2">{t('s23p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s23i1')}</li><li>{t('s23i2')}</li><li>{t('s23i3')}</li><li>{t('s23i4')}</li>
            </ul>
            <h3 className="text-xl font-semibold mb-2 mt-4 text-[hsl(var(--forum-text-primary))]">{t('s24t')}</h3>
            <p className="mb-2">{t('s24p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s24i1')}</li><li>{t('s24i2')}</li><li>{t('s24i3')}</li><li>{t('s24i4')}</li><li>{t('s24i5')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s3t')}</h2>
            <p className="mb-2">{t('s3p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s3items')}</ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s4t')}</h2>
            <p className="mb-2">{t('s4p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>{t('s4i1')}</strong></li><li><strong>{t('s4i2')}</strong></li><li><strong>{t('s4i3')}</strong></li><li><strong>{t('s4i4')}</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s5t')}</h2>
            <p className="mb-2">{t('s5p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>{t('s5i1')}</strong></li><li><strong>{t('s5i2')}</strong></li><li><strong>{t('s5i3')}</strong></li><li><strong>{t('s5i4')}</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s6t')}</h2>
            <p className="mb-2">{t('s6p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s6items')}</ul>
            <p className="mt-2">{t('s6note')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s7t')}</h2>
            <p className="mb-2">{t('s7p')}</p>
            <p className="mt-2">{t('s7note')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s8t')}</h2>
            <p className="mb-2">{t('s8p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">{renderItems('s8items')}</ul>
            <p className="mt-2">{t('s8note')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s9t')}</h2>
            <p>{t('s9p')}</p>
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
            <p>{t('s13p')} <a href="/contacto" className="text-[hsl(var(--forum-link))] hover:underline">{t('s13link')}</a>.</p>
          </section>

          <div className="mt-8 p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
            <p className="text-sm"><strong>{t('importantNote')}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
