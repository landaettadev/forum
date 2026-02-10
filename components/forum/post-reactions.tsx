'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type Reaction = {
  reaction_type: string;
  emoji: string;
  count: number;
  user_reacted: boolean;
};

type ReactionType = {
  id: string;
  emoji: string;
  label: string;
};

type PostReactionsProps = {
  postId: string;
};

const DEFAULT_REACTIONS_BASE = [
  { id: 'like', emoji: '👍', labelKey: 'reactionLike' },
  { id: 'love', emoji: '❤️', labelKey: 'reactionLove' },
  { id: 'laugh', emoji: '😂', labelKey: 'reactionLaugh' },
  { id: 'wow', emoji: '😮', labelKey: 'reactionWow' },
  { id: 'sad', emoji: '😢', labelKey: 'reactionSad' },
  { id: 'fire', emoji: '🔥', labelKey: 'reactionFire' },
  { id: '100', emoji: '💯', labelKey: 'reactionPerfect' },
] as const;

export function PostReactions({ postId }: PostReactionsProps) {
  const { user } = useAuth();
  const t = useTranslations('forum');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [postId, user]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_post_reactions', {
          p_post_id: postId,
          p_user_id: user?.id || null
        });

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      toast.error(t('mustLoginToReact'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('toggle_reaction', {
          p_post_id: postId,
          p_user_id: user.id,
          p_reaction_type: reactionType
        });

      if (error) throw error;
      
      // Update local state optimistically
      setReactions(prev => {
        const existing = prev.find(r => r.reaction_type === reactionType);
        if (existing) {
          if (data.action === 'removed') {
            // Decrease count or remove
            if (existing.count <= 1) {
              return prev.filter(r => r.reaction_type !== reactionType);
            }
            return prev.map(r => 
              r.reaction_type === reactionType 
                ? { ...r, count: r.count - 1, user_reacted: false }
                : r
            );
          } else {
            return prev.map(r => 
              r.reaction_type === reactionType 
                ? { ...r, count: r.count + 1, user_reacted: true }
                : r
            );
          }
        } else {
          // Add new reaction
          const reactionInfo = DEFAULT_REACTIONS_BASE.find(r => r.id === reactionType);
          return [...prev, {
            reaction_type: reactionType,
            emoji: reactionInfo?.emoji || '👍',
            count: 1,
            user_reacted: true
          }];
        }
      });

      setPopoverOpen(false);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error(t('reactError'));
    } finally {
      setLoading(false);
    }
  };

  const visibleReactions = reactions.filter(r => r.count > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Show existing reactions */}
      {visibleReactions.map((reaction) => (
        <button
          key={reaction.reaction_type}
          onClick={() => handleReaction(reaction.reaction_type)}
          disabled={loading || !user}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
            "border hover:scale-105",
            reaction.user_reacted
              ? "bg-[hsl(var(--forum-accent))]/10 border-[hsl(var(--forum-accent))] text-[hsl(var(--forum-accent))]"
              : "bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50"
          )}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-[hsl(var(--forum-accent))]"
            disabled={!user}
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {DEFAULT_REACTIONS_BASE.map((reaction) => {
              const existing = reactions.find(r => r.reaction_type === reaction.id);
              return (
                <button
                  key={reaction.id}
                  onClick={() => handleReaction(reaction.id)}
                  disabled={loading}
                  title={t(reaction.labelKey)}
                  className={cn(
                    "p-2 rounded hover:bg-[hsl(var(--forum-surface-hover))] transition-all hover:scale-110",
                    existing?.user_reacted && "bg-[hsl(var(--forum-accent))]/10"
                  )}
                >
                  <span className="text-xl">{reaction.emoji}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
