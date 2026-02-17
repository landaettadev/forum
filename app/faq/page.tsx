'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="forum-surface overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[hsl(var(--forum-surface-alt))] transition-colors"
      >
        <span className="font-medium">{question}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-4 forum-text-secondary [&_a]:text-[hsl(var(--forum-accent))] [&_a]:underline [&_a]:hover:opacity-80"
          dangerouslySetInnerHTML={{ __html: answer }}
        />
      )}
    </div>
  );
}

export default function FAQPage() {
  const t = useTranslations('faq');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="forum-text-secondary">
            {t('subtitle')}
          </p>
        </div>

        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <FAQItem key={n} question={t(`q${n}`)} answer={t(`a${n}`)} />
          ))}
        </div>

        <div className="mt-8 forum-surface p-6 text-center">
          <h2 className="font-semibold mb-2">{t('notFound')}</h2>
          <p className="forum-text-secondary mb-4">
            {t('notFoundDesc')}
          </p>
          <a
            href="/contacto"
            className="inline-block px-6 py-2 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white rounded transition-colors"
          >
            {t('contactBtn')}
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
