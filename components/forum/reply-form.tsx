'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { createReply } from '@/app/hilo/[id]/actions';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QuotedPosts } from './quote-block';
import type { QuoteData } from './quote-button';
import { useTranslations } from 'next-intl';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

type ReplyFormProps = {
  threadId: string;
  quotes?: QuoteData[];
  onRemoveQuote?: (postId: string) => void;
  onSuccess?: () => void;
};

export function ReplyForm({ threadId, quotes = [], onRemoveQuote, onSuccess }: ReplyFormProps) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const t = useTranslations('forum');
  const tc = useTranslations('common');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error(t('mustLoginToReplyShort'));
      return;
    }

    const textContent = stripHtml(content);
    if (textContent.length < 3) {
      toast.error(t('replyTooShort'));
      return;
    }

    setLoading(true);

    try {
      const result = await createReply({
        threadId,
        authorId: user.id,
        content: content.trim(),
      });

      if (result.success) {
        toast.success(t('replySuccess'));
        setContent('');
        setEditorKey(k => k + 1);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else {
        toast.error(t('replyError'), {
          description: result.error,
        });
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="forum-surface p-6 text-center">
        <p className="forum-text-secondary mb-4">
          {t('mustLoginToReply')}
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild variant="outline">
            <Link href="/login">{t('loginButton')}</Link>
          </Button>
          <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]">
            <Link href="/registro">{t('registerButton')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-surface p-3 sm:p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
        {t('replyToThread')}
      </h3>

      {quotes.length > 0 && (
        <div className="mb-4">
          <QuotedPosts
            quotes={quotes}
            onRemoveQuote={onRemoveQuote}
            isEditing={true}
          />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <RichTextEditor
            key={editorKey}
            content={content}
            onChange={setContent}
            placeholder={t('replyPlaceholder')}
            minHeight="150px"
            userId={user.id}
            showPreview={false}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <p className="text-xs forum-text-muted text-center sm:text-left">
            {t('replyingAs')} <span className="font-semibold">{profile.username}</span>
          </p>
          <Button
            type="submit"
            disabled={loading || stripHtml(content).length < 3}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] w-full sm:w-auto"
          >
            {loading ? t('publishing') : t('publishReply')}
          </Button>
        </div>
      </form>
    </div>
  );
}
