'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Check } from 'lucide-react';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
];

export function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState('es');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useRef<string>('lang-panel-' + Math.random().toString(36).slice(2));

  useEffect(() => {
    setMounted(true);
    const locale = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || 'es';
    setCurrentLocale(locale);
  }, []);

  const toggleOpen = useCallback(() => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelWidth = 220;
      let left = rect.right - panelWidth;
      if (left < 8) left = 8;
      setCoords({ top: rect.bottom + 6, left });
    }
    setOpen(o => !o);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (
        btnRef.current?.contains(target) ||
        document.getElementById(panelId.current)?.contains(target)
      ) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const changeLanguage = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    // Mark that user manually selected a locale (so auto-detection won't override)
    document.cookie = `LOCALE_MANUAL=true;path=/;max-age=31536000`;
    setCurrentLocale(locale);
    setOpen(false);
    window.location.reload();
  };

  const currentLang = languages.find(l => l.code === currentLocale) || languages[0];

  const panel = open && mounted ? createPortal(
    <div
      id={panelId.current}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        zIndex: 99999,
      }}
      className="w-[420px] max-w-[calc(100vw-16px)] rounded-xl border border-[hsl(var(--forum-border))] bg-[hsl(var(--forum-surface))] shadow-2xl p-2 animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <div className="grid grid-cols-2 gap-0.5">
        {languages.map((lang) => {
          const isActive = currentLocale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={`text-left px-2.5 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[hsl(var(--forum-accent))]/10 text-[hsl(var(--forum-accent))] font-semibold'
                  : 'hover:bg-[hsl(var(--forum-accent-muted))]'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="flex-1 truncate forum-hover-sweep">{lang.name}</span>
              {isActive && <Check className="h-3 w-3 flex-shrink-0 text-[hsl(var(--forum-accent))]" />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium hover:bg-[hsl(var(--forum-accent-muted))] transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
        <span className="sm:hidden">{currentLang.flag}</span>
      </button>
      {panel}
    </>
  );
}
