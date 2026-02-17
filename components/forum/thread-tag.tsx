'use client';

import { useTranslations } from 'next-intl';

type ThreadTagProps = {
  tag: 'review' | 'ask' | 'general';
  size?: 'sm' | 'md';
};

export function ThreadTag({ tag, size = 'sm' }: ThreadTagProps) {
  const t = useTranslations('forum');

  const tagConfig = {
    review: {
      label: t('tagReview'),
      icon: '⭐',
      bgColor: 'bg-emerald-900/20',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-700/30',
    },
    ask: {
      label: t('tagAsk'),
      icon: '❓',
      bgColor: 'bg-slate-700/20',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-600/30',
    },
    general: {
      label: t('tagGeneral'),
      icon: '💬',
      bgColor: 'bg-slate-700/20',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-600/30',
    },
  };

  const config = tagConfig[tag] || tagConfig.general;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
