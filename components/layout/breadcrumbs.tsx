'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const t = useTranslations('common');

  return (
    <nav className="flex items-center gap-2 text-sm forum-text-secondary py-3">
      <Link href="/" className="hover:text-[hsl(var(--forum-accent))] transition-colors">
        {t('home')}
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-[hsl(var(--forum-accent))] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[hsl(var(--forum-text-primary))]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
