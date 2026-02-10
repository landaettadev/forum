'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type PollCreatorProps = {
  threadId: string;
  onPollCreated?: () => void;
  onCancel?: () => void;
};

export function PollCreator({ threadId, onPollCreated, onCancel }: PollCreatorProps) {
  const t = useTranslations('poll');
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    if (!question.trim()) {
      toast.error(t('questionRequired'));
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error(t('minOptions'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('create_poll', {
          p_thread_id: threadId,
          p_question: question.trim(),
          p_options: validOptions,
          p_user_id: user.id,
          p_allow_multiple: allowMultiple,
          p_show_results_before_vote: showResultsBeforeVote,
          p_ends_at: hasEndDate && endDate ? new Date(endDate).toISOString() : null
        });

      if (error) throw error;

      if (data.success) {
        toast.success(t('pollCreated'));
        onPollCreated?.();
      } else {
        toast.error(data.error || t('createError'));
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error(t('createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forum-surface p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
        <h3 className="font-semibold">{t('createPoll')}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question */}
        <div>
          <Label htmlFor="question">{t('question')}</Label>
          <Input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('questionPlaceholder')}
            className="mt-1"
            maxLength={200}
          />
        </div>

        {/* Options */}
        <div>
          <Label>{t('options')}</Label>
          <div className="space-y-2 mt-1">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`${t('option')} ${index + 1}`}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addOption}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('addOption')}
            </Button>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-3 pt-2 border-t border-[hsl(var(--forum-border))]">
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-multiple" className="cursor-pointer">
              {t('allowMultiple')}
            </Label>
            <Switch
              id="allow-multiple"
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-results" className="cursor-pointer">
              {t('showResultsBeforeVote')}
            </Label>
            <Switch
              id="show-results"
              checked={showResultsBeforeVote}
              onCheckedChange={setShowResultsBeforeVote}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="has-end-date" className="cursor-pointer">
              {t('setEndDate')}
            </Label>
            <Switch
              id="has-end-date"
              checked={hasEndDate}
              onCheckedChange={setHasEndDate}
            />
          </div>

          {hasEndDate && (
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-2"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('create')
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('cancel')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
