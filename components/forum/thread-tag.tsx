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
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
    },
    ask: {
      label: t('tagAsk'),
      icon: '❓',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
    },
    general: {
      label: t('tagGeneral'),
      icon: '💬',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200',
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
