'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  username: string;
  avatar_url: string | null;
  lastMessage?: string;
  unreadCount: number;
}

export function FloatingChat() {
  const { user, profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('chat');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchConversations();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      const conversationMap = new Map<string, Conversation>();
      
      for (const msg of data) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationMap.has(otherId)) {
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', otherId)
            .single();

          if (otherUser) {
            conversationMap.set(otherId, {
              id: otherId,
              username: otherUser.username,
              avatar_url: otherUser.avatar_url,
              lastMessage: msg.content,
              unreadCount: msg.receiver_id === user.id && !msg.is_read ? 1 : 0
            });
          }
        } else if (msg.receiver_id === user.id && !msg.is_read) {
          const conv = conversationMap.get(otherId)!;
          conv.unreadCount++;
        }
      }

      setConversations(Array.from(conversationMap.values()));
    }
  };

  const fetchMessages = async (recipientId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(username, avatar_url)
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      
      await supabase
        .from('chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('sender_id', recipientId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    }
  };

  const sendMessage = async () => {
    if (!user || !activeConversation || !newMessage.trim()) return;

    setIsSending(true);

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: user.id,
        receiver_id: activeConversation,
        content: newMessage.trim()
      });

    if (!error) {
      setNewMessage('');
      fetchMessages(activeConversation);
    }

    setIsSending(false);
  };

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (!user || !profile) return null;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </Button>
      ) : (
        <div className={`bg-[hsl(var(--forum-surface))] border border-[hsl(var(--forum-border))] rounded-lg shadow-2xl overflow-hidden transition-all ${isMinimized ? 'w-72 h-12' : 'w-80 h-96'}`}>
          <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--forum-accent))] text-white">
            <span className="font-semibold text-sm">
              {activeConversation ? t('title') : t('messages')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => {
                  setIsOpen(false);
                  setActiveConversation(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {!activeConversation ? (
                <div className="h-[calc(100%-40px)] overflow-y-auto">
                  {conversations.length > 0 ? (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConversation(conv.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors border-b border-[hsl(var(--forum-border))]"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.avatar_url || undefined} />
                          <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-sm">
                            {getUserInitials(conv.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{conv.username}</span>
                            {conv.unreadCount > 0 && (
                              <span className="h-5 w-5 rounded-full bg-[hsl(var(--forum-accent))] text-white text-xs flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs forum-text-muted truncate">
                            {conv.lastMessage}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <MessageCircle className="h-12 w-12 forum-text-muted mb-2" />
                      <p className="text-sm forum-text-muted">{t('noConversations')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-[calc(100%-40px)]">
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="px-3 py-2 text-xs text-left hover:bg-[hsl(var(--forum-surface-alt))] border-b border-[hsl(var(--forum-border))]"
                  >
                    ← {t('backToConversations')}
                  </button>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                            msg.sender_id === user.id
                              ? 'bg-[hsl(var(--forum-accent))] text-white'
                              : 'bg-[hsl(var(--forum-surface-alt))]'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? 'text-white/70' : 'forum-text-muted'}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: dateLocale })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-2 border-t border-[hsl(var(--forum-border))]">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={t('placeholder')}
                        className="text-sm h-8"
                        disabled={isSending}
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                        onClick={sendMessage}
                        disabled={isSending || !newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
