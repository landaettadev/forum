'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { BannerSlot } from '@/components/ads/banner-slot';
import { OnlineUsersBar } from './online-users-bar';

export function Footer() {
  const t = useTranslations();

  return (
    <>
    <OnlineUsersBar />
    <footer className="bg-[hsl(var(--forum-surface))] border-t border-[hsl(var(--forum-border))]/50 mt-0">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center mb-6">
          <BannerSlot position="footer" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-extrabold forum-gradient-text mb-4">
              TS Rating
            </div>
            <p className="text-sm forum-text-muted">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">{t('sidebar.usefulLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/reglas" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('sidebar.rules')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('sidebar.faq')}
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('sidebar.contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">{t('nav.forums')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/foros" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('footer.viewAllForums')}
                </Link>
              </li>
              <li>
                <Link href="/galeria" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('footer.gallery')}
                </Link>
              </li>
              <li>
                <Link href="/buscar" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('common.search')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacidad" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors">
                  {t('legal.cookies')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center my-6">
          <BannerSlot position="footer" />
        </div>

        <div className="border-t border-[hsl(var(--forum-border))]/50 pt-6 mt-6 text-center text-sm forum-text-muted">
          <p>&copy; {new Date().getFullYear()} TS Rating. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
    </>
  );
}
