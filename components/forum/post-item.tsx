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
import { 
  Flag, Edit, History, Save, X, Settings2, Trash2, MoreHorizontal,
  MessageSquare, FileText, ThumbsUp, MapPin 
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportModal } from './report-modal';
import { AdvancedEditDialog } from './advanced-edit-dialog';
import { EditHistoryModal } from './edit-history-modal';
import { ThanksButton } from './thanks-button';
import { QuoteButton } from './quote-button';
import type { QuoteData } from './quote-button';
import { BookmarkButton } from './bookmark-button';
import { useAuth } from '@/lib/auth-context';
import { MentionText } from './mention-text';
import { PostReactions } from './post-reactions';
import { PostEmbeds } from './post-embeds';
import { CodeHighlight } from './code-highlight';
import { editPost, deletePost } from '@/app/actions/thread-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type PostItemProps = {
  post: Post & {
    author: Profile;
    quoted_posts?: string[];
  };
  threadId: string;
  threadTitle?: string;
  threadTag?: string;
  isFirstPost?: boolean;
  canModerate?: boolean;
  onQuote?: (quoteData: QuoteData) => void;
};

export function PostItem({ post, threadId, threadTitle, threadTag, isFirstPost = false, canModerate = false, onQuote }: PostItemProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('post');
  const tRoles = useTranslations('roles');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [thanksCount, setThanksCount] = useState(0);
  const [hasThanked, setHasThanked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isEdited = post.updated_at !== post.created_at;
  const isAuthor = user?.id === post.author.id;
  const canEdit = isAuthor || canModerate;
  const canDelete = canModerate;

  useEffect(() => {
    const fetchPostData = async () => {
      try {
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

  return (
    <div className={`relative overflow-hidden transition-all duration-200 bg-[hsl(var(--forum-surface))]`}
      style={{
        border: '1px solid hsl(var(--forum-border))',
        borderRadius: 'var(--radius)',
        boxShadow: isFirstPost ? 'var(--forum-shadow-strong)' : 'var(--forum-shadow)',
      }}
    >
      {/* First post: animated gold accent line with traveling light */}
      {isFirstPost && (
        <div className="relative h-[2px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--forum-accent)/0.3)] to-transparent" />
          <div 
            className="absolute top-0 h-full w-[20%]"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--forum-accent) / 0.8), hsl(var(--forum-sweep-flash) / 0.6), hsl(var(--forum-accent) / 0.8), transparent)',
              animation: 'line-light-sweep 4s ease-in-out infinite',
            }}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        {/* Desktop: author panel — clean, spacious, no hard borders */}
        <div className="hidden md:flex flex-col items-center w-44 flex-shrink-0 py-5 px-3 border-r border-[hsl(var(--forum-border)/0.25)]">
          <Link href={`/user/${post.author.username}`} className="flex flex-col items-center text-center group">
            <Avatar className={`ring-1 ring-[hsl(var(--forum-border)/0.4)] ${isFirstPost ? 'h-16 w-16' : 'h-14 w-14'} transition-all group-hover:ring-[hsl(var(--forum-accent)/0.4)]`}>
              <AvatarImage src={post.author.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--forum-surface-alt))] text-[hsl(var(--forum-text-secondary))] text-sm font-medium">
                {getUserInitials(post.author.username)}
              </AvatarFallback>
            </Avatar>
            
            <span className="font-semibold text-[13px] mt-2.5 forum-hover-sweep">
              {post.author.username}
            </span>
          </Link>

          <div className="flex flex-wrap justify-center gap-1 mt-1.5">
            {post.author.role === 'admin' && <span className="badge-admin">{tRoles('roleAdmin')}</span>}
            {post.author.role === 'mod' && <span className="badge-mod">{tRoles('roleMod')}</span>}
            {post.author.is_escort && <span className="badge-escort">{tRoles('roleEscort')}</span>}
            {post.author.is_vip && <span className="badge-vip">{tRoles('roleVip')}</span>}
            {post.author.is_verified && <span className="badge-verified">{tRoles('roleVerified')}</span>}
          </div>

          <div className="text-[11px] forum-text-muted mt-3 space-y-1 text-center w-full">
            <div className="flex items-center justify-center gap-1.5">
              <FileText className="h-3 w-3 opacity-50" />
              <span>{post.author.posts_count} {t('posts')}</span>
              {post.author.thanks_received > 0 && (
                <>
                  <span className="opacity-30">·</span>
                  <ThumbsUp className="h-3 w-3 opacity-50" />
                  <span>{post.author.thanks_received}</span>
                </>
              )}
            </div>
            <div className="text-[10px] opacity-60">
              {new Date(post.author.created_at).toLocaleDateString(locale)}
            </div>
            {post.author.location_city && post.author.location_country && (
              <div className="flex items-center justify-center gap-1 text-[10px] opacity-50">
                <MapPin className="h-2.5 w-2.5" />
                <span>{post.author.location_city}</span>
              </div>
            )}
            {post.author.activity_badge && (
              <div className="text-[10px] text-[hsl(var(--forum-accent))] opacity-70 mt-1">
                {post.author.activity_badge}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: minimal author row */}
        <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-[hsl(var(--forum-border)/0.2)]">
          <Link href={`/user/${post.author.username}`} className="flex-shrink-0">
            <Avatar className="h-9 w-9 ring-1 ring-[hsl(var(--forum-border)/0.3)]">
              <AvatarImage src={post.author.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--forum-surface-alt))] text-[hsl(var(--forum-text-secondary))] text-xs font-medium">
                {getUserInitials(post.author.username)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex items-center gap-2">
            <Link
              href={`/user/${post.author.username}`}
              className="font-semibold text-sm text-[hsl(var(--forum-text-primary))] hover:text-[hsl(var(--forum-accent))] transition-colors truncate"
            >
              {post.author.username}
            </Link>
            <div className="flex flex-wrap gap-1">
              {post.author.role === 'admin' && <span className="badge-admin">{tRoles('roleAdmin')}</span>}
              {post.author.role === 'mod' && <span className="badge-mod">{tRoles('roleMod')}</span>}
              {post.author.is_escort && <span className="badge-escort">{tRoles('roleEscort')}</span>}
              {post.author.is_vip && <span className="badge-vip">{tRoles('roleVip')}</span>}
              {post.author.is_verified && <span className="badge-verified">{tRoles('roleVerified')}</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 px-3 py-4 sm:px-6 sm:py-6">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[120px] text-[15px]"
                disabled={isSaving}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={isSaving || !editContent.trim()}
                  onClick={async () => {
                    setIsSaving(true);
                    const result = await editPost(post.id, editContent);
                    setIsSaving(false);
                    if (result.success) {
                      toast.success(t('editSuccess'));
                      setIsEditing(false);
                      window.location.reload();
                    } else {
                      toast.error(result.error || t('editError'));
                    }
                  }}
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? t('saving') : t('save')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  disabled={isSaving}
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
          <div className="prose prose-invert max-w-none">
            {post.content.includes('<') && post.content.includes('>') ? (
              <>
                <div
                  className="text-[15px] leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
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
          )}

          <PostEmbeds content={post.content} />

          {post.author.signature && (
            <div className="mt-6 pt-4 border-t border-[hsl(var(--forum-border)/0.15)]">
              <div className="text-[12px] forum-text-muted italic opacity-60">
                {post.author.signature}
              </div>
            </div>
          )}

          <div className="mt-4">
            <PostReactions postId={post.id} />
          </div>

          <div className="mt-4 sm:mt-8 pt-3 sm:pt-5 border-t border-[hsl(var(--forum-border)/0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] forum-text-muted">
              <span className="opacity-70">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}</span>
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

            <div className="flex items-center gap-0.5 flex-wrap">
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

              <div className="w-px h-3.5 bg-[hsl(var(--forum-border)/0.2)] mx-0.5" />

              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-[hsl(var(--forum-text-secondary))] hover:bg-[hsl(var(--forum-surface-hover))] h-8 px-2 opacity-50 hover:opacity-100 transition-opacity"
                onClick={() => setShowReportModal(true)}
              >
                <Flag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">{t('report')}</span>
              </Button>

              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-[hsl(var(--forum-accent))]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => { setIsEditing(true); setEditContent(post.content); }}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                        {t('edit')}
                      </DropdownMenuItem>
                    )}
                    {canEdit && isFirstPost && (
                      <DropdownMenuItem
                        onClick={() => setShowAdvancedEdit(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <Settings2 className="h-4 w-4" />
                        {t('advancedEdit')}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isDeleting}
                          className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                          onClick={async () => {
                            const msg = isFirstPost
                              ? t('confirmDeleteThread')
                              : t('confirmDeletePost');
                            if (!confirm(msg)) return;
                            setIsDeleting(true);
                            const result = await deletePost(post.id);
                            setIsDeleting(false);
                            if (result.success) {
                              const data = result.data as { deletedThread?: boolean };
                              if (data?.deletedThread) {
                                toast.success(t('threadDeleted'));
                                router.push('/');
                              } else {
                                toast.success(t('postDeleted'));
                                window.location.reload();
                              }
                            } else {
                              toast.error(result.error || t('deleteError'));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {isDeleting ? t('deleting') : t('delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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

      {isFirstPost && (
        <AdvancedEditDialog
          open={showAdvancedEdit}
          onOpenChange={setShowAdvancedEdit}
          threadId={threadId}
          initialTitle={threadTitle || ''}
          initialTag={threadTag || ''}
          initialContent={post.content}
        />
      )}
    </div>
  );
}
