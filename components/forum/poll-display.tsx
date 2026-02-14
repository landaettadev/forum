'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup as _RadioGroup, RadioGroupItem as _RadioGroupItem } from '@/components/ui/radio-group';
import { Label as _Label } from '@/components/ui/label';
import { Progress as _Progress } from '@/components/ui/progress';
import { BarChart3, Users, Clock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';

type PollOption = {
  id: string;
  text: string;
  votes: number;
  user_voted: boolean;
};

type PollData = {
  poll_id: string;
  question: string;
  allow_multiple: boolean;
  show_results_before_vote: boolean;
  ends_at: string | null;
  is_closed: boolean;
  total_votes: number;
  user_has_voted: boolean;
  options: PollOption[];
};

type PollDisplayProps = {
  threadId: string;
};

export function PollDisplay({ threadId }: PollDisplayProps) {
  const t = useTranslations('poll');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const fetchPoll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_poll_with_results', { 
          p_thread_id: threadId,
          p_user_id: user?.id || null
        });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPoll(data[0]);
        // Pre-select user's previous votes
        if (data[0].user_has_voted) {
          const userVotes = data[0].options
            .filter((o: PollOption) => o.user_voted)
            .map((o: PollOption) => o.id);
          setSelectedOptions(userVotes);
        }
      }
    } catch (error) {
      console.error('Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  }, [threadId, user]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const handleVote = async () => {
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    if (selectedOptions.length === 0) {
      toast.error(t('selectOption'));
      return;
    }

    setVoting(true);
    try {
      const { data, error } = await supabase
        .rpc('vote_on_poll', {
          p_poll_id: poll!.poll_id,
          p_option_ids: selectedOptions,
          p_user_id: user.id
        });

      if (error) throw error;

      if (data.success) {
        toast.success(t('voteRecorded'));
        fetchPoll(); // Refresh poll data
      } else {
        toast.error(data.error || t('voteError'));
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error(t('voteError'));
    } finally {
      setVoting(false);
    }
  };

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (poll?.allow_multiple) {
      if (checked) {
        setSelectedOptions([...selectedOptions, optionId]);
      } else {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId));
      }
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const canSeeResults = poll && (
    poll.user_has_voted || 
    poll.show_results_before_vote || 
    poll.is_closed ||
    (poll.ends_at && new Date(poll.ends_at) < new Date())
  );

  const isPollClosed = poll && (
    poll.is_closed || 
    (poll.ends_at && new Date(poll.ends_at) < new Date())
  );

  if (loading) {
    return (
      <div className="forum-surface p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!poll) return null;

  return (
    <div className="forum-surface p-4 mb-4">
      {/* Poll header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
          <h3 className="font-semibold">{poll.question}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs forum-text-muted">
          <Users className="h-4 w-4" />
          <span>{poll.total_votes} {t('votes')}</span>
        </div>
      </div>

      {/* Poll status */}
      {isPollClosed && (
        <div className="mb-3 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded text-sm text-orange-500">
          {t('pollClosed')}
        </div>
      )}

      {poll.ends_at && !isPollClosed && (
        <div className="mb-3 flex items-center gap-2 text-xs forum-text-muted">
          <Clock className="h-4 w-4" />
          <span>{t('endsIn')} {formatDistanceToNow(new Date(poll.ends_at), { locale: dateLocale })}</span>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const percentage = poll.total_votes > 0 
            ? Math.round((option.votes / poll.total_votes) * 100) 
            : 0;

          return (
            <div key={option.id} className="relative">
              {canSeeResults ? (
                // Results view
                <div className="relative overflow-hidden rounded-lg border border-[hsl(var(--forum-border))] p-3">
                  <div 
                    className="absolute inset-0 bg-[hsl(var(--forum-accent))]/10 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {option.user_voted && (
                        <Check className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
                      )}
                      <span className={option.user_voted ? 'font-medium' : ''}>
                        {option.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{percentage}%</span>
                      <span className="forum-text-muted">({option.votes})</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Voting view
                <label 
                  className={`flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--forum-border))] cursor-pointer hover:bg-[hsl(var(--forum-surface-hover))] transition-colors ${
                    selectedOptions.includes(option.id) ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5' : ''
                  }`}
                >
                  {poll.allow_multiple ? (
                    <Checkbox
                      checked={selectedOptions.includes(option.id)}
                      onCheckedChange={(checked) => handleOptionChange(option.id, !!checked)}
                      disabled={!!isPollClosed}
                    />
                  ) : (
                    <input
                      type="radio"
                      name="poll-option"
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => handleOptionChange(option.id, true)}
                      disabled={!!isPollClosed}
                      className="h-4 w-4 text-[hsl(var(--forum-accent))]"
                    />
                  )}
                  <span>{option.text}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Vote button */}
      {!isPollClosed && !poll.user_has_voted && user && (
        <div className="mt-4">
          <Button
            onClick={handleVote}
            disabled={voting || selectedOptions.length === 0}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {voting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('voting')}
              </>
            ) : (
              t('vote')
            )}
          </Button>
          {poll.allow_multiple && (
            <span className="ml-3 text-xs forum-text-muted">{t('multipleAllowed')}</span>
          )}
        </div>
      )}

      {/* Login prompt */}
      {!user && !isPollClosed && (
        <p className="mt-4 text-sm forum-text-muted">
          {t('loginToVote')}
        </p>
      )}
    </div>
  );
}
