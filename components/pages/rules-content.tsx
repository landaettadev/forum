'use client';

import { useTranslations } from 'next-intl';
import { 
  Shield, Heart, Lock, BadgeCheck, Flag, UserX, 
  AlertTriangle, Scale, Eye, Ban, FileWarning, Gavel
} from 'lucide-react';

export function RulesContent() {
  const t = useTranslations('rules');

  const rules = [
    { id: 'respect', icon: Heart, color: 'text-pink-500' },
    { id: 'adults', icon: UserX, color: 'text-red-500' },
    { id: 'content', icon: FileWarning, color: 'text-orange-500' },
    { id: 'privacy', icon: Lock, color: 'text-blue-500' },
    { id: 'safety', icon: Shield, color: 'text-green-500' },
    { id: 'verification', icon: BadgeCheck, color: 'text-cyan-500' },
    { id: 'legal', icon: Scale, color: 'text-purple-500' },
    { id: 'noExploitation', icon: Ban, color: 'text-red-600' },
    { id: 'discretion', icon: Eye, color: 'text-indigo-500' },
    { id: 'reports', icon: Flag, color: 'text-yellow-500' },
  ];

  return (
    <div className="forum-surface p-6">
      <div className="flex items-center gap-3 mb-6">
        <Gavel className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>

      <p className="forum-text-secondary mb-8 text-lg">
        {t('subtitle')}
      </p>

      <div className="space-y-6 text-[15px] leading-relaxed">
        {rules.map((rule, index) => {
          const Icon = rule.icon;
          return (
            <section key={rule.id} className="border-b border-[hsl(var(--forum-border))] pb-6 last:border-0">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--forum-surface-alt))]">
                  <Icon className={`h-5 w-5 ${rule.color}`} />
                </span>
                <span className="text-[hsl(var(--forum-accent))]">
                  {index + 1}. {t(`${rule.id}.title`)}
                </span>
              </h2>
              <p className="forum-text-secondary ml-11">
                {t(`${rule.id}.description`)}
              </p>
              {t.has(`${rule.id}.details`) && (
                <ul className="mt-3 ml-11 space-y-2">
                  {(t.raw(`${rule.id}.details`) as string[]).map((detail: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm forum-text-muted">
                      <span className="text-[hsl(var(--forum-accent))]">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400 mb-2">{t('warning.title')}</h3>
              <p className="text-sm forum-text-secondary">
                {t('warning.description')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded-lg">
          <p className="text-sm forum-text-secondary text-center">
            {t('lastUpdated')}: Enero 2026
          </p>
        </div>
      </div>
    </div>
  );
}
