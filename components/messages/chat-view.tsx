'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

type ChatViewProps = {
  conversationId: string;
  otherUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  onBack?: () => void;
};

export function ChatView({ conversationId, otherUser, onBack }: ChatViewProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const tc = useTranslations('common');
  const tm = useTranslations('messages');
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*, sender:profiles!sender_id(id, username, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const fetchMessageWithSender = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*, sender:profiles!sender_id(id, username, avatar_url)')
        .eq('id', messageId)
        .single();

      if (error) throw error;
      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error fetching message:', error);
    }
  };

  const markAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_id: user.id
    });
  }, [conversationId, user]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      markAsRead();

      // Subscribe to new messages
      const channel = supabase
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          fetchMessageWithSender(payload.new.id);
          markAsRead();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, fetchMessages, markAsRead]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_private_message', {
        p_conversation_id: conversationId,
        p_sender_id: user.id,
        p_content: newMessage.trim()
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setNewMessage('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(tc('messageSendError'));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-[hsl(var(--forum-accent))] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[hsl(var(--forum-border))] flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {otherUser && (
          <Link href={`/usuaria/${otherUser.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="h-9 w-9">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback>{otherUser.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{otherUser.username}</h3>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{tm('noMessagesInConversation')}</p>
            <p className="text-xs mt-1 opacity-70">{tm('sendFirstMessage')}</p>
          </div>
        ) : (
        <div className="space-y-4">
          {messages.map((message, idx) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (
              idx === 0 || messages[idx - 1]?.sender_id !== message.sender_id
            );
            const showTime = idx === messages.length - 1 || 
              messages[idx + 1]?.sender_id !== message.sender_id ||
              new Date(messages[idx + 1]?.created_at).getTime() - new Date(message.created_at).getTime() > 300000;

            // Date separator
            const msgDate = new Date(message.created_at).toLocaleDateString(locale);
            const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at).toLocaleDateString(locale) : null;
            const showDateSeparator = idx === 0 || msgDate !== prevDate;

            return (
              <div key={message.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[hsl(var(--forum-border))]" />
                  <span className="text-[11px] text-muted-foreground font-medium">{msgDate}</span>
                  <div className="flex-1 h-px bg-[hsl(var(--forum-border))]" />
                </div>
              )}
              <div
                className={cn(
                  "flex gap-2",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                {!isOwn && (
                  <div className="w-8">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender?.avatar_url || undefined} />
                        <AvatarFallback>
                          {message.sender?.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div className={cn(
                  "max-w-[70%] space-y-1",
                  isOwn && "items-end"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-2",
                    isOwn 
                      ? "bg-[hsl(var(--forum-accent))] text-white rounded-br-md"
                      : "bg-[hsl(var(--forum-surface-alt))] rounded-bl-md"
                  )}>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.content}
                    </p>
                  </div>
                  {showTime && (
                    <p className={cn(
                      "text-[10px] text-muted-foreground px-2",
                      isOwn && "text-right"
                    )}>
                      {formatDistanceToNow(new Date(message.created_at), { 
                        addSuffix: true, 
                        locale: dateLocale 
                      })}
                    </p>
                  )}
                </div>
              </div>
              </div>
            );
          })}
        </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-[hsl(var(--forum-border))]">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tm('sendPlaceholder')}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] h-[44px] w-[44px] flex-shrink-0"
          >
            {sending ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">{tm('enterToSend')}</p>
      </div>
    </div>
  );
}
