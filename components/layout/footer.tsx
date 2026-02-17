'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { BannerSlot } from '@/components/ads/banner-slot';
import { OnlineUsersBar } from './online-users-bar';
import { ModeratorsModal } from './moderators-modal';
import { Twitter, Instagram, Send, Music2, MessageCircle, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SocialLinks {
  twitter: string;
  instagram: string;
  telegram: string;
  tiktok: string;
  discord: string;
  reddit: string;
}

export function Footer() {
  const t = useTranslations();
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    twitter: '',
    instagram: '',
    telegram: '',
    tiktok: '',
    discord: '',
    reddit: '',
  });

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('key, value')
          .like('key', 'social_%');

        if (data) {
          const links: SocialLinks = {
            twitter: '',
            instagram: '',
            telegram: '',
            tiktok: '',
            discord: '',
            reddit: '',
          };
          data.forEach((row: { key: string; value: string | null }) => {
            const key = row.key.replace('social_', '') as keyof SocialLinks;
            if (key in links) {
              links[key] = row.value || '';
            }
          });
          setSocialLinks(links);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    };

    fetchSocialLinks();
  }, []);

  return (
    <>
    <OnlineUsersBar />
    <footer className="bg-[hsl(var(--forum-surface))] border-t border-[hsl(var(--forum-border))]/50 mt-0">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex justify-center mb-4 sm:mb-6">
          <BannerSlot position="footer" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-3 sm:mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="TS Rating"
                className="h-24 sm:h-32 w-auto hover:opacity-90 transition-opacity"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xl font-extrabold forum-gradient-text">TS Rating</span>
            </Link>
            <p className="text-xs sm:text-sm forum-text-muted">
              {t('footer.description')}
            </p>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-3 mt-4">
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center hover:bg-[hsl(var(--forum-accent))]/20 hover:text-[hsl(var(--forum-accent))] transition-colors forum-text-muted"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center hover:bg-[hsl(var(--forum-accent))]/20 hover:text-[hsl(var(--forum-accent))] transition-colors forum-text-muted"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks.telegram && (
                <a
                  href={socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center hover:bg-[hsl(var(--forum-accent))]/20 hover:text-[hsl(var(--forum-accent))] transition-colors forum-text-muted"
                  aria-label="Telegram"
                >
                  <Send className="h-4 w-4" />
                </a>
              )}
              {socialLinks.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center hover:bg-[hsl(var(--forum-accent))]/20 hover:text-[hsl(var(--forum-accent))] transition-colors forum-text-muted"
                  aria-label="TikTok"
                >
                  <Music2 className="h-4 w-4" />
                </a>
              )}
              {socialLinks.discord && (
                <a
                  href={socialLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center hover:bg-[hsl(var(--forum-accent))]/20 hover:text-[hsl(var(--forum-accent))] transition-colors forum-text-muted"
                  aria-label="Discord"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
              {socialLinks.reddit && (
                <a
                  href={socialLinks.reddit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center hover:bg-[hsl(var(--forum-accent))]/20 hover:text-[hsl(var(--forum-accent))] transition-colors forum-text-muted"
                  aria-label="Reddit"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
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
              <li>
                <ModeratorsModal />
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

        <div className="border-t border-[hsl(var(--forum-border))]/50 pt-6 mt-6 text-center text-sm forum-text-muted space-y-1">
          <p>&copy; {new Date().getFullYear()} TS Rating. {t('footer.rights')}</p>
          <p className="text-xs opacity-60">
            {t('footer.developedBy')}{' '}
            <a 
              href="https://tsrating.com" 
              className="hover:text-[hsl(var(--forum-accent))] transition-colors"
            >
              tsrating.com
            </a>
          </p>
        </div>
      </div>
    </footer>
    </>
  );
}
