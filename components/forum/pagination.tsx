'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
};

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('common');

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', page.toString());
    const url = baseUrl || pathname;
    return `${url}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={currentPage === 1}
        className="gap-1"
      >
        {currentPage === 1 ? (
          <span>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('previous')}</span>
          </span>
        ) : (
          <Link href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('previous')}</span>
          </Link>
        )}
      </Button>

      <div className="flex gap-1">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <Button
              key={pageNum}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              asChild={!isActive}
              disabled={isActive}
              className={isActive ? 'bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]' : ''}
            >
              {isActive ? (
                <span>{pageNum}</span>
              ) : (
                <Link href={createPageUrl(pageNum)}>{pageNum}</Link>
              )}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={currentPage === totalPages}
        className="gap-1"
      >
        {currentPage === totalPages ? (
          <span>
            <span className="hidden sm:inline">{t('next')}</span>
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link href={createPageUrl(currentPage + 1)}>
            <span className="hidden sm:inline">{t('next')}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </Button>
    </div>
  );
}
