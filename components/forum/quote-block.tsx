'use client';

import { useState } from 'react';
import { MessageSquareQuote, X, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { MentionText } from './mention-text';

interface QuoteBlockProps {
  authorUsername: string;
  authorId?: string;
  content: string;
  postId?: string;
  threadId?: string;
  createdAt?: string;
  onRemove?: () => void;
  isEditing?: boolean;
  depth?: number; // For nested quotes
  nestedQuotes?: QuoteBlockProps[]; // Support nested quotes
}

export function QuoteBlock({
  authorUsername,
  authorId,
  content,
  postId,
  threadId,
  createdAt,
  onRemove,
  isEditing = false,
  depth = 0,
  nestedQuotes = []
}: QuoteBlockProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const tc = useTranslations('common');
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-collapse deep nests
  const isLongContent = content.length > 300;
  const [showFullContent, setShowFullContent] = useState(!isLongContent);
  
  // Limit nesting depth for visual clarity
  const maxDepth = 3;
  const effectiveDepth = Math.min(depth, maxDepth);
  
  // Different border colors for nesting levels
  const borderColors = [
    'border-[hsl(var(--forum-accent))]',
    'border-blue-500',
    'border-green-500',
    'border-orange-500'
  ];

  return (
    <div className={`relative border-l-4 ${borderColors[effectiveDepth]} bg-[hsl(var(--forum-surface-alt))] rounded-r-lg p-3 mb-2 ${depth > 0 ? 'ml-2' : ''}`}>
      {/* Quote header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <MessageSquareQuote className={`h-4 w-4 ${effectiveDepth === 0 ? 'text-[hsl(var(--forum-accent))]' : effectiveDepth === 1 ? 'text-blue-500' : 'text-green-500'}`} />
          <span className="font-medium">
            {authorId ? (
              <Link 
                href={`/user/${authorUsername}`}
                className="hover:text-[hsl(var(--forum-accent))] transition-colors"
              >
                @{authorUsername}
              </Link>
            ) : (
              `@${authorUsername}`
            )}
          </span>
          {createdAt && (
            <span className="text-muted-foreground text-xs">
              · {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dateLocale })}
            </span>
          )}
          {postId && threadId && (
            <Link 
              href={`/hilo/${threadId}#post-${postId}`}
              className="text-xs text-[hsl(var(--forum-accent))] hover:underline"
            >
              ↗ {tc('viewOriginal')}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(nestedQuotes.length > 0 || isLongContent) && (
            <button
              onClick={() => depth > 0 ? setIsExpanded(!isExpanded) : setShowFullContent(!showFullContent)}
              className="p-1 hover:bg-[hsl(var(--forum-surface-hover))] rounded transition-colors"
              title={isExpanded || showFullContent ? tc('collapse') : tc('expand')}
            >
              {(isExpanded || showFullContent) ? (
                <ChevronUp className="h-4 w-4 forum-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 forum-text-muted" />
              )}
            </button>
          )}
          {isEditing && onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              title="Quitar cita"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Nested quotes (shown first if expanded) */}
      {nestedQuotes.length > 0 && isExpanded && (
        <div className="mb-2">
          {nestedQuotes.map((nestedQuote, index) => (
            <QuoteBlock
              key={index}
              {...nestedQuote}
              depth={depth + 1}
              isEditing={false}
            />
          ))}
        </div>
      )}

      {/* Quote content with mentions support */}
      <div className={`text-sm forum-text-secondary ${!showFullContent && isLongContent ? 'line-clamp-3' : ''}`}>
        {content.split('\n').map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            <MentionText content={line} />
          </span>
        ))}
      </div>

      {/* Show more/less for long content */}
      {isLongContent && (
        <button
          onClick={() => setShowFullContent(!showFullContent)}
          className="text-xs text-[hsl(var(--forum-accent))] hover:underline mt-1"
        >
          {showFullContent ? 'Ver menos' : 'Ver más...'}
        </button>
      )}
    </div>
  );
}

// Component to render multiple quotes
interface QuotedPostsProps {
  quotes: Array<{
    id: string;
    authorUsername: string;
    authorId?: string;
    content: string;
    threadId?: string;
    createdAt?: string;
  }>;
  onRemoveQuote?: (postId: string) => void;
  isEditing?: boolean;
}

export function QuotedPosts({ quotes, onRemoveQuote, isEditing = false }: QuotedPostsProps) {
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="space-y-2">
      {quotes.map((quote) => (
        <QuoteBlock
          key={quote.id}
          authorUsername={quote.authorUsername}
          authorId={quote.authorId}
          content={quote.content}
          postId={quote.id}
          threadId={quote.threadId}
          createdAt={quote.createdAt}
          onRemove={onRemoveQuote ? () => onRemoveQuote(quote.id) : undefined}
          isEditing={isEditing}
        />
      ))}
    </div>
  );
}
