'use client';

import { useState } from 'react';
import { PostItem } from './post-item';
import { ReplyForm } from './reply-form';
import type { QuoteData } from './quote-button';
import type { Post, Profile } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

interface ThreadContentProps {
  posts: (Post & { author: Profile })[];
  threadId: string;
  isLocked: boolean;
  currentPage: number;
}

export function ThreadContent({ posts, threadId, isLocked, currentPage }: ThreadContentProps) {
  const t = useTranslations('forum');
  const [quotes, setQuotes] = useState<QuoteData[]>([]);

  const handleQuote = (quoteData: QuoteData) => {
    // Avoid duplicate quotes
    if (quotes.some(q => q.id === quoteData.id)) {
      return;
    }
    // Max 3 quotes
    if (quotes.length >= 3) {
      setQuotes([...quotes.slice(1), quoteData]);
    } else {
      setQuotes([...quotes, quoteData]);
    }
  };

  const handleRemoveQuote = (postId: string) => {
    setQuotes(quotes.filter(q => q.id !== postId));
  };

  const handleReplySuccess = () => {
    setQuotes([]);
  };

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <PostItem
          key={post.id}
          post={post}
          threadId={threadId}
          isFirstPost={currentPage === 1 && index === 0}
          onQuote={handleQuote}
        />
      ))}

      {!isLocked ? (
        <ReplyForm 
          threadId={threadId} 
          quotes={quotes}
          onRemoveQuote={handleRemoveQuote}
          onSuccess={handleReplySuccess}
        />
      ) : (
        <div className="forum-surface p-4 text-center forum-text-muted">
          {t('threadClosedNoReplies')}
        </div>
      )}
    </div>
  );
}
