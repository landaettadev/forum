'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { Search, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

type Conversation = {
  conversation_id: string;
  is_group: boolean;
  group_name: string | null;
  last_message_at: string;
  is_muted: boolean;
  is_archived: boolean;
  unread_count: number;
  last_message_content: string | null;
  last_message_sender_id: string | null;
  other_user_id: string | null;
  other_user_username: string | null;
  other_user_avatar: string | null;
};

type ConversationListProps = {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
  onNewMessage: () => void;
};

export function ConversationList({ selectedId, onSelect, onNewMessage }: ConversationListProps) {
  const { user } = useAuth();
  const locale = useLocale();
  const tc = useTranslations('common');
  const dateLocale = getDateFnsLocale(locale);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_conversations', { p_user_id: user.id });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('conversations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'private_messages'
        }, () => {
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchConversations]);

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      conv.other_user_username?.toLowerCase().includes(searchLower) ||
      conv.group_name?.toLowerCase().includes(searchLower) ||
      conv.last_message_content?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[hsl(var(--forum-border))]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tc('searchConversations')}
              className="pl-9"
            />
          </div>
          <Button size="icon" variant="outline" onClick={onNewMessage}>
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquarePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{tc('noConversations')}</p>
            <Button variant="link" onClick={onNewMessage} className="mt-2">
              {tc('startNew')}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--forum-border))]">
            {filteredConversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => onSelect(conv.conversation_id)}
                className={cn(
                  "w-full p-3 flex items-center gap-3 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors text-left",
                  selectedId === conv.conversation_id && "bg-[hsl(var(--forum-accent))]/10"
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conv.other_user_avatar || undefined} />
                    <AvatarFallback>
                      {conv.is_group 
                        ? conv.group_name?.[0]?.toUpperCase() 
                        : conv.other_user_username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[hsl(var(--forum-accent))] text-white text-xs flex items-center justify-center">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-medium truncate",
                      conv.unread_count > 0 && "text-[hsl(var(--forum-accent))]"
                    )}>
                      {conv.is_group ? conv.group_name : conv.other_user_username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.last_message_at), { 
                        addSuffix: false, 
                        locale: dateLocale 
                      })}
                    </span>
                  </div>
                  {conv.last_message_content && (
                    <p className={cn(
                      "text-sm truncate",
                      conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {conv.last_message_content}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
