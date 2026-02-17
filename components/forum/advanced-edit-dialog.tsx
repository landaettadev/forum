'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { editThread } from '@/app/actions/thread-actions';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="border border-[hsl(var(--forum-border))] rounded-lg p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      </div>
    )
  }
);

interface AdvancedEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  initialTitle: string;
  initialTag: string;
  initialContent: string;
  initialNsfw?: boolean;
}

export function AdvancedEditDialog({
  open,
  onOpenChange,
  threadId,
  initialTitle,
  initialTag,
  initialContent,
  initialNsfw = false,
}: AdvancedEditDialogProps) {
  const { user } = useAuth();
  const t = useTranslations('post');
  const tThread = useTranslations('thread');
  const tForum = useTranslations('forum');
  const [title, setTitle] = useState(initialTitle);
  const [tag, setTag] = useState(initialTag);
  const [content, setContent] = useState(initialContent);
  const [isNsfw, setIsNsfw] = useState(initialNsfw);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await editThread(threadId, {
      title: title.trim(),
      tag: tag || undefined,
      content: content.trim(),
      isNsfw,
    });
    setIsSaving(false);
    if (result.success) {
      toast.success(t('advEditSuccess'));
      onOpenChange(false);
      window.location.reload();
    } else {
      toast.error(result.error || t('advEditError'));
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(initialTitle);
      setTag(initialTag);
      setContent(initialContent);
      setIsNsfw(initialNsfw);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('advancedEdit')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tag Selector */}
          <div className="space-y-2">
            <Label>{tForum('selectTag')} *</Label>
            <Select
              value={tag}
              onValueChange={setTag}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue placeholder={tForum('selectTagPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="review">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/20 text-emerald-400">⭐</span>
                    {tForum('tagReview')}
                  </div>
                </SelectItem>
                <SelectItem value="ask">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/20 text-slate-300">❓</span>
                    {tForum('tagAsk')}
                  </div>
                </SelectItem>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/20 text-slate-400">💬</span>
                    {tForum('tagGeneral')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>{tThread('titleLabel')} *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tThread('titlePlaceholder')}
              disabled={isSaving}
              minLength={5}
              className="text-lg"
            />
            <p className="text-xs forum-text-muted">{tThread('minTitleHint')}</p>
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-2">
            <Label>{tThread('contentLabel')} *</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder={tThread('contentPlaceholder')}
              userId={user?.id}
              minHeight="400px"
              disabled={isSaving}
            />
            <p className="text-xs forum-text-muted">{tThread('minContentHint')}</p>
          </div>

          {/* NSFW Toggle */}
          <div className="flex items-center justify-between p-4 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <Label htmlFor="adv-nsfw" className="cursor-pointer">{tThread('nsfwLabel')}</Label>
                <p className="text-xs forum-text-muted">{tThread('nsfwDescription')}</p>
              </div>
            </div>
            <Switch
              id="adv-nsfw"
              checked={isNsfw}
              onCheckedChange={setIsNsfw}
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('cancel')}
          </Button>
          <Button
            disabled={isSaving || !title.trim() || title.trim().length < 5 || !content.trim() || content.trim().length < 10}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {t('save')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
