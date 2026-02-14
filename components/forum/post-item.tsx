'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Post, Profile } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { Flag, Edit, History } from 'lucide-react';
import { ReportModal } from './report-modal';
import { EditHistoryModal } from './edit-history-modal';
import { ThanksButton } from './thanks-button';
import { QuoteButton } from './quote-button';
import type { QuoteData } from './quote-button';
import { BookmarkButton } from './bookmark-button';
import { QuotedPosts as _QuotedPosts } from './quote-block';
import { useAuth } from '@/lib/auth-context';
import { MentionText } from './mention-text';
import { PostReactions } from './post-reactions';
import { PostEmbeds } from './post-embeds';
import { CodeHighlight } from './code-highlight';

type PostItemProps = {
  post: Post & {
    author: Profile;
    quoted_posts?: string[];
  };
  threadId: string;
  isFirstPost?: boolean;
  canModerate?: boolean;
  onQuote?: (quoteData: QuoteData) => void;
};

export function PostItem({ post, threadId, isFirstPost = false, canModerate = false, onQuote }: PostItemProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const { user } = useAuth();
  const t = useTranslations('post');
  const tRoles = useTranslations('roles');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [thanksCount, setThanksCount] = useState(0);
  const [hasThanked, setHasThanked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isEdited = post.updated_at !== post.created_at;

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        // Fetch thanks count
        const { count, error: countError } = await supabase
          .from('post_thanks')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (!countError) setThanksCount(count || 0);
      } catch {}

      if (user) {
        try {
          const { data: thankData } = await supabase
            .from('post_thanks')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setHasThanked(!!thankData);
        } catch {}

        try {
          const { data: bookmarkData } = await supabase
            .from('post_bookmarks')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setIsBookmarked(!!bookmarkData);
        } catch {}
      }
    };

    fetchPostData();
  }, [post.id, user]);

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const _getBadgeColor = (role: string) => {
    if (role === 'admin') return 'badge-admin';
    if (role === 'mod') return 'badge-mod';
    return '';
  };

  return (
    <div className={`forum-surface ${isFirstPost ? 'border-l-4 border-[hsl(var(--forum-accent))]' : ''}`}>
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {/* Mobile: compact horizontal author bar */}
        <div className="flex md:hidden items-center gap-3">
          <Link href={`/usuaria/${post.author.username}`} className="flex-shrink-0">
            <Avatar className="h-10 w-10 border-2 border-[hsl(var(--forum-border))]">
              <AvatarImage src={post.author.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-sm">
                {getUserInitials(post.author.username)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link
              href={`/usuaria/${post.author.username}`}
              className="font-semibold text-sm hover:text-[hsl(var(--forum-accent))] transition-colors block truncate"
            >
              {post.author.username}
            </Link>
            <div className="flex flex-wrap gap-1">
              {post.author.role === 'admin' && <span className="badge-admin">{tRoles('roleAdmin')}</span>}
              {post.author.role === 'mod' && <span className="badge-mod">{tRoles('roleMod')}</span>}
              {post.author.is_vip && <span className="badge-vip">{tRoles('roleVip')}</span>}
              {post.author.is_verified && <span className="badge-verified">{tRoles('roleVerified')}</span>}
            </div>
          </div>
        </div>

        {/* Desktop: vertical author sidebar */}
        <div className="hidden md:block w-40 flex-shrink-0 space-y-3">
          <Link href={`/usuaria/${post.author.username}`}>
            <Avatar className="h-20 w-20 border-2 border-[hsl(var(--forum-border))]">
              <AvatarImage src={post.author.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-xl">
                {getUserInitials(post.author.username)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="space-y-1">
            <Link
              href={`/usuaria/${post.author.username}`}
              className="font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors block"
            >
              {post.author.username}
            </Link>

            <div className="flex flex-wrap gap-1">
              {post.author.role === 'admin' && <span className="badge-admin">{tRoles('roleAdmin')}</span>}
              {post.author.role === 'mod' && <span className="badge-mod">{tRoles('roleMod')}</span>}
              {post.author.is_vip && <span className="badge-vip">{tRoles('roleVip')}</span>}
              {post.author.is_verified && <span className="badge-verified">{tRoles('roleVerified')}</span>}
            </div>

            <div className="text-xs forum-text-muted space-y-1">
              <div>{t('posts')}: {post.author.posts_count}</div>
              <div>{t('registered')}: {new Date(post.author.created_at).toLocaleDateString(locale)}</div>
              {post.author.location_city && post.author.location_country && (
                <div>
                  📍 {post.author.location_city}, {post.author.location_country}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="prose prose-invert max-w-none">
            {post.content.includes('<') && post.content.includes('>') ? (
              <>
                <div
                  className="text-[15px] leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
                {/* Syntax highlighting for code blocks */}
                <CodeHighlight content={post.content} />
              </>
            ) : (
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {post.content.split('\n').map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    <MentionText content={line} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Auto-embeds for YouTube, Twitter/X, TikTok */}
          <PostEmbeds content={post.content} />

          {post.author.signature && (
            <div className="mt-4 pt-4 border-t border-[hsl(var(--forum-border))]">
              <div className="text-xs forum-text-muted italic">
                {post.author.signature}
              </div>
            </div>
          )}

          {/* Reactions */}
          <div className="mt-3">
            <PostReactions postId={post.id} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs forum-text-muted">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}</span>
              {isEdited && (
                <>
                  <span>•</span>
                  <button
                    onClick={() => setShowEditHistory(true)}
                    className="flex items-center gap-1 hover:text-[hsl(var(--forum-accent))] transition-colors"
                  >
                    <History className="h-3 w-3" />
                    <span>{t('edited')}</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <ThanksButton
                postId={post.id}
                postAuthorId={post.author.id}
                initialThanksCount={thanksCount}
                initialHasThanked={hasThanked}
                size="sm"
              />

              {onQuote && (
                <QuoteButton
                  postId={post.id}
                  postContent={post.content}
                  postAuthorUsername={post.author.username}
                  postAuthorId={post.author.id}
                  threadId={threadId}
                  createdAt={post.created_at}
                  onQuote={onQuote}
                  size="sm"
                />
              )}

              <BookmarkButton
                postId={post.id}
                initialBookmarked={isBookmarked}
                size="sm"
              />

              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                onClick={() => setShowReportModal(true)}
              >
                <Flag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('report')}</span>
              </Button>

              {canModerate && (
                <Button variant="ghost" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('edit')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="post"
        targetId={post.id}
      />

      <EditHistoryModal
        isOpen={showEditHistory}
        onClose={() => setShowEditHistory(false)}
        postId={post.id}
      />
    </div>
  );
}
