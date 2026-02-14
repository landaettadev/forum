'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

type Message = {
  id: string;
  content: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  is_read: boolean;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
};

export default function ConversationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const otherUserId = params?.id as string;
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('messages');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_verified')
      .eq('id', otherUserId)
      .maybeSingle();

    if (!profile) {
      router.push('/mensajes');
      return;
    }

    setOtherUser(profile);

    const { data: messageData } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (messageData) {
      setMessages(messageData);

      const unreadMessages = messageData.filter(
        (msg) => msg.to_user_id === user.id && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        await supabase
          .from('private_messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      }
    }

    setLoading(false);
  }, [user, otherUserId, router]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchConversation();
  }, [user, otherUserId, router, fetchConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !otherUser) return;

    if (newMessage.trim().length === 0) {
      toast.error(t('emptyMessageError'));
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase
        .from('private_messages')
        .insert({
          from_user_id: user.id,
          to_user_id: otherUserId,
          content: newMessage.trim(),
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        toast.error(t('sendError'), {
          description: error.message,
        });
      } else {
        setMessages([...messages, data]);
        setNewMessage('');
        toast.success(t('messageSent'));
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setSending(false);
    }
  };

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6 w-full">
          <div className="text-center py-12">{t('loadingConversation')}</div>
        </div>
      </div>
    );
  }

  if (!otherUser) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs
          items={[
            { label: t('title'), href: '/mensajes' },
            { label: otherUser.username },
          ]}
        />

        <div className="flex gap-6">
          <main className="flex-1">
            <div className="forum-surface flex flex-col" style={{ height: 'calc(100vh - 16rem)' }}>
              <div className="flex items-center gap-4 p-4 border-b border-[hsl(var(--forum-border))]">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="mr-2"
                >
                  <Link href="/mensajes">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>

                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white">
                    {getUserInitials(otherUser.username)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/usuaria/${otherUser.username}`}
                      className="font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors"
                    >
                      {otherUser.username}
                    </Link>
                    {otherUser.is_verified && (
                      <span className="badge-verified">✓</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 forum-text-muted">
                    <p>{t('noMessagesInConversation')}</p>
                    <p className="text-sm mt-2">{t('sendFirstMessage')}</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      const isFromMe = message.from_user_id === user.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] ${
                              isFromMe
                                ? 'bg-[hsl(var(--forum-accent))] text-white'
                                : 'bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))]'
                            } rounded-lg p-3`}
                          >
                            <div className="text-sm break-words">{message.content}</div>
                            <div
                              className={`text-xs mt-1 ${
                                isFromMe ? 'text-white/70' : 'forum-text-muted'
                              }`}
                            >
                              {formatDistanceToNow(new Date(message.created_at), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="border-t border-[hsl(var(--forum-border))] p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Textarea
                    placeholder={t('sendPlaceholder')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="min-h-[60px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={sending || newMessage.trim().length === 0}
                    className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] self-end"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-xs forum-text-muted mt-2">
                  {t('enterToSend')}
                </p>
              </div>
            </div>
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
