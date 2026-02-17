'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, X, Send, Minimize2, Search, MoreHorizontal, ArrowLeft, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  conversation_id: string;
  other_user_id: string | null;
  other_user_username: string | null;
  other_user_avatar: string | null;
  last_message_content: string | null;
  last_message_at: string;
  unread_count: number;
}

interface OnlineUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function FloatingChat() {
  const { user, profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('chat');
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<OnlineUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations using the existing RPC
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .rpc('get_user_conversations', { p_user_id: user.id });
      if (!error && data) {
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [user]);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .gte('last_seen_at', fiveMinutesAgo)
      .neq('id', user?.id || '')
      .order('last_seen_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setOnlineUsers(data);
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*, sender:profiles!sender_id(id, username, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        // Mark as read
        if (user) {
          await supabase.rpc('mark_conversation_read', {
            p_conversation_id: conversationId,
            p_user_id: user.id
          });
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [user]);

  // Start conversation with a user
  const startConversation = async (targetUser: OnlineUser) => {
    if (!user) return;
    
    try {
      const { data: conversationId, error } = await supabase
        .rpc('get_or_create_conversation', {
          p_user_id: user.id,
          p_other_user_id: targetUser.id
        });

      if (!error && conversationId) {
        setActiveConversation(conversationId);
        setActiveOtherUser(targetUser);
        setActiveTab('messages');
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!user || !activeConversation || !newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.rpc('send_private_message', {
        p_conversation_id: activeConversation,
        p_sender_id: user.id,
        p_content: newMessage.trim()
      });

      if (error) throw error;
      if (data?.success) {
        setNewMessage('');
        fetchMessages(activeConversation);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(t('sendError'));
    } finally {
      setIsSending(false);
    }
  };

  // Effects
  useEffect(() => {
    if (user && isOpen) {
      fetchConversations();
      fetchOnlineUsers();
      const interval = setInterval(fetchOnlineUsers, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isOpen, fetchConversations, fetchOnlineUsers]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      
      // Real-time subscription
      const channel = supabase
        .channel(`floating-chat:${activeConversation}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${activeConversation}`
        }, () => {
          fetchMessages(activeConversation);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const filteredOnlineUsers = onlineUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || !profile) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center font-medium">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      ) : (
        <div className="bg-[hsl(var(--forum-surface))] border border-[hsl(var(--forum-border))] rounded-lg shadow-2xl overflow-hidden w-80 h-[420px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--forum-accent))] text-white flex-shrink-0">
            <span className="font-semibold text-sm">
              {activeConversation && activeOtherUser ? activeOtherUser.username : t('title')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? t('unpin') : t('pin')}
              >
                <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-white")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => {
                  if (!isPinned) {
                    setIsOpen(false);
                    setActiveConversation(null);
                    setActiveOtherUser(null);
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!activeConversation ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-[hsl(var(--forum-border))]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-[hsl(var(--forum-border))] p-0 h-auto flex-shrink-0">
                  <TabsTrigger 
                    value="online" 
                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent py-2 text-xs"
                  >
                    {t('usersOnline')} ({onlineUsers.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages" 
                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent py-2 text-xs"
                  >
                    {t('messages')} {totalUnread > 0 && `(${totalUnread})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="online" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    {filteredOnlineUsers.length > 0 ? (
                      <div>
                        {filteredOnlineUsers.map((onlineUser) => (
                          <button
                            key={onlineUser.id}
                            onClick={() => startConversation(onlineUser)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors text-left"
                          >
                            <div className="relative">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={onlineUser.avatar_url || undefined} />
                                <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-xs">
                                  {getUserInitials(onlineUser.username)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[hsl(var(--forum-surface))]" />
                            </div>
                            <span className="font-medium text-sm">{onlineUser.username}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <p className="text-sm forum-text-muted">{t('noUsersOnline')}</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="messages" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    {conversations.length > 0 ? (
                      <div>
                        {conversations.map((conv) => (
                          <button
                            key={conv.conversation_id}
                            onClick={() => {
                              setActiveConversation(conv.conversation_id);
                              setActiveOtherUser({
                                id: conv.other_user_id || '',
                                username: conv.other_user_username || '',
                                avatar_url: conv.other_user_avatar
                              });
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors text-left"
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={conv.other_user_avatar || undefined} />
                              <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-xs">
                                {conv.other_user_username ? getUserInitials(conv.other_user_username) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "font-medium text-sm truncate",
                                  conv.unread_count > 0 && "text-[hsl(var(--forum-accent))]"
                                )}>
                                  {conv.other_user_username}
                                </span>
                                {conv.unread_count > 0 && (
                                  <span className="h-4 w-4 rounded-full bg-[hsl(var(--forum-accent))] text-white text-[10px] flex items-center justify-center">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              {conv.last_message_content && (
                                <p className="text-xs forum-text-muted truncate">
                                  {conv.last_message_content}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <MessageCircle className="h-10 w-10 forum-text-muted mb-2 opacity-50" />
                        <p className="text-sm forum-text-muted">{t('noConversations')}</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Back button */}
              <button
                onClick={() => {
                  setActiveConversation(null);
                  setActiveOtherUser(null);
                  fetchConversations();
                }}
                className="px-3 py-2 text-xs text-left hover:bg-[hsl(var(--forum-surface-alt))] border-b border-[hsl(var(--forum-border))] flex items-center gap-1 flex-shrink-0"
              >
                <ArrowLeft className="h-3 w-3" />
                {t('back')}
              </button>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex", msg.sender_id === user.id ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                          msg.sender_id === user.id
                            ? "bg-[hsl(var(--forum-accent))] text-white rounded-br-sm"
                            : "bg-[hsl(var(--forum-surface-alt))] rounded-bl-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          msg.sender_id === user.id ? "text-white/70" : "forum-text-muted"
                        )}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-2 border-t border-[hsl(var(--forum-border))] flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={t('typePlaceholder')}
                    className="text-sm h-9"
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] flex-shrink-0"
                    onClick={sendMessage}
                    disabled={isSending || !newMessage.trim()}
                  >
                    {isSending ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
