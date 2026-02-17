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
    <nav className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm forum-text-secondary py-2 sm:py-3 overflow-x-auto scrollbar-none whitespace-nowrap">
      <Link href="/" className="hover:text-[hsl(var(--forum-accent))] transition-colors flex-shrink-0 font-medium">
        {t('home')}
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1 sm:gap-2 min-w-0">
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 opacity-40" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-[hsl(var(--forum-accent))] transition-colors truncate max-w-[80px] sm:max-w-[200px] md:max-w-none"
              title={item.label}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[hsl(var(--forum-text-primary))] font-medium truncate max-w-[100px] sm:max-w-[250px] md:max-w-none" title={item.label}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
