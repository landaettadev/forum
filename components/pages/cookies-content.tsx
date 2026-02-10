'use client';

import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Cookie } from 'lucide-react';

export function CookiesContent() {
  const t = useTranslations('cookiesPage');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1">
      <Breadcrumbs items={[{ label: t('breadcrumb') }]} />

      <div className="forum-surface p-8">
        <div className="flex items-center gap-3 mb-6">
          <Cookie className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
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
            <p>{t('s2p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s3t')}</h2>
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
                <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--forum-text-primary))]">{t('s31t')}</h3>
                <p className="mb-2"><strong>{t('s31purpose')}</strong></p>
                <p className="mb-2"><strong>{t('s31duration')}</strong></p>
                <p className="mb-2">{t('s31desc')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>{t('s31i1')}</li><li>{t('s31i2')}</li><li>{t('s31i3')}</li><li>{t('s31i4')}</li>
                </ul>
                <p className="mt-2 text-sm font-semibold">{t('s31note')}</p>
              </div>

              <div className="p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
                <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--forum-text-primary))]">{t('s32t')}</h3>
                <p className="mb-2"><strong>{t('s32purpose')}</strong></p>
                <p className="mb-2"><strong>{t('s32duration')}</strong></p>
                <p className="mb-2">{t('s32desc')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>{t('s32i1')}</li><li>{t('s32i2')}</li><li>{t('s32i3')}</li>
                </ul>
              </div>

              <div className="p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
                <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--forum-text-primary))]">{t('s33t')}</h3>
                <p className="mb-2"><strong>{t('s33purpose')}</strong></p>
                <p className="mb-2"><strong>{t('s33duration')}</strong></p>
                <p className="mb-2">{t('s33desc')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>{t('s33i1')}</li><li>{t('s33i2')}</li><li>{t('s33i3')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s4t')}</h2>
            <p className="mb-2">{t('s4p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s4i1')}</li><li>{t('s4i2')}</li><li>{t('s4i3')}</li>
            </ul>
            <p className="mt-2">{t('s4note')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s5t')}</h2>
            <p className="mb-2">{t('s5p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s5i1')}</li><li>{t('s5i2')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s6t')}</h2>
            <p className="mb-4">{t('s6p')}</p>
            <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--forum-text-primary))]">{t('s61t')}</h3>
            <p className="mb-2">{t('s61p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>{t('s61i1')}</li><li>{t('s61i2')}</li><li>{t('s61i3')}</li><li>{t('s61i4')}</li>
            </ul>
            <p className="mb-2">{t('s61links')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] hover:underline">Microsoft Edge</a></li>
            </ul>
            <h3 className="text-lg font-semibold mb-2 mt-4 text-[hsl(var(--forum-text-primary))]">{t('s62t')}</h3>
            <p>{t('s62p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s7t')}</h2>
            <p className="mb-2">{t('s7p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('s7i1')}</li><li>{t('s7i2')}</li><li>{t('s7i3')}</li><li>{t('s7i4')}</li>
            </ul>
            <p className="mt-2"><strong>{t('s7note')}</strong></p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s8t')}</h2>
            <p>{t('s8p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s9t')}</h2>
            <p>{t('s9p')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s10t')}</h2>
            <p className="mb-2">{t('s10p')}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] hover:underline">All About Cookies</a></li>
              <li><a href="https://www.youronlinechoices.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] hover:underline">Your Online Choices</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[hsl(var(--forum-text-primary))]">{t('s11t')}</h2>
            <p>{t('s11p')} <a href="/contacto" className="text-[hsl(var(--forum-link))] hover:underline">{t('s11link')}</a>.</p>
          </section>

          <div className="mt-8 p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
            <h3 className="font-semibold mb-2 text-[hsl(var(--forum-text-primary))]">{t('summaryTitle')}</h3>
            <ul className="text-sm space-y-1">
              <li>{t('summaryI1')}</li><li>{t('summaryI2')}</li><li>{t('summaryI3')}</li><li>{t('summaryI4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
