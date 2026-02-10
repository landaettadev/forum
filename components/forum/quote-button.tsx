'use client';

import { Button } from '@/components/ui/button';
import { Quote } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuoteButtonProps {
  postId: string;
  postContent: string;
  postAuthorUsername: string;
  postAuthorId: string;
  threadId: string;
  createdAt: string;
  onQuote: (quoteData: QuoteData) => void;
  size?: 'sm' | 'md';
}

export interface QuoteData {
  id: string;
  content: string;
  authorUsername: string;
  authorId: string;
  threadId: string;
  createdAt: string;
}

export function QuoteButton({
  postId,
  postContent,
  postAuthorUsername,
  postAuthorId,
  threadId,
  createdAt,
  onQuote,
  size = 'sm'
}: QuoteButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');

  const handleQuote = () => {
    if (!user) {
      toast.error(t('mustLoginToQuote'));
      return;
    }

    // Truncate content if too long
    const truncatedContent = postContent.length > 500 
      ? postContent.substring(0, 500) + '...' 
      : postContent;

    onQuote({
      id: postId,
      content: truncatedContent,
      authorUsername: postAuthorUsername,
      authorId: postAuthorId,
      threadId,
      createdAt
    });

    toast.success(t('quoteAdded'));
  };

  const sizeClasses = {
    sm: 'h-7 text-xs px-2 gap-1',
    md: 'h-8 text-sm px-3 gap-1.5'
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuote}
            disabled={!user}
            className={`${sizeClasses[size]} text-muted-foreground hover:text-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-muted))]`}
          >
            <Quote className={iconSize} />
            <span className="hidden sm:inline">{t('quote')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t('quoteThisPost')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
