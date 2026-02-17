'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Mail, Search, ArrowLeft, MessageSquare, Eye, RefreshCw, ChevronRight, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale } from 'next-intl';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  user1?: { username: string; avatar_url: string | null; role: string };
  user2?: { username: string; avatar_url: string | null; role: string };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { username: string; avatar_url: string | null; role: string };
}

export default function AdminMessagesPage() {
  const { profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (profile && !['admin', 'mod'].includes(profile.role)) {
      redirect('/');
    }
    if (profile) fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(username, avatar_url, role),
        user2:profiles!conversations_user2_id_fkey(username, avatar_url, role)
      `)
      .order('last_message_at', { ascending: false })
      .limit(100);

    if (data) setConversations(data as Conversation[]);
    setIsLoading(false);
  }, []);

  const fetchMessages = async (convo: Conversation) => {
    setSelectedConvo(convo);
    setLoadingMessages(true);
    const { data } = await supabase
      .from('private_messages')
      .select(`
        *,
        sender:profiles!private_messages_sender_id_fkey(username, avatar_url, role)
      `)
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) setMessages(data as Message[]);
    setLoadingMessages(false);
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user1?.username?.toLowerCase().includes(q) ||
      c.user2?.username?.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1">Admin</Badge>;
    if (role === 'mod') return <Badge className="bg-blue-500/20 text-blue-400 text-[9px] px-1">Mod</Badge>;
    return null;
  };

  if (!profile || !['admin', 'mod'].includes(profile.role)) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
              <Mail className="h-7 w-7 text-[hsl(var(--forum-accent))]" />
              Visor de Mensajes
            </h1>
            <p className="forum-text-secondary text-sm">Historial completo de conversaciones privadas</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/logs">
              <Button variant="outline" className="gap-2"><Eye className="h-4 w-4" /> Auditoría</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Panel Admin</Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[500px]">
          {/* Conversation List */}
          <Card className="forum-surface border-[hsl(var(--forum-border))] w-full sm:w-96 flex-shrink-0 flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Conversaciones ({filteredConversations.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchConversations}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar usuario..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {isLoading ? (
                <p className="text-center py-8 forum-text-muted text-sm">Cargando...</p>
              ) : filteredConversations.length === 0 ? (
                <p className="text-center py-8 forum-text-muted text-sm">No hay conversaciones</p>
              ) : (
                <div className="divide-y divide-[hsl(var(--forum-border))]">
                  {filteredConversations.map((convo) => (
                    <div
                      key={convo.id}
                      onClick={() => fetchMessages(convo)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[hsl(var(--forum-surface-alt))] transition-colors ${
                        selectedConvo?.id === convo.id ? 'bg-[hsl(var(--forum-surface-alt))] border-l-2 border-l-[hsl(var(--forum-accent))]' : ''
                      }`}
                    >
                      <div className="flex -space-x-2 flex-shrink-0">
                        <Avatar className="h-7 w-7 border-2 border-[hsl(var(--forum-bg))]">
                          <AvatarImage src={convo.user1?.avatar_url || undefined} />
                          <AvatarFallback className="text-[9px] bg-[hsl(var(--forum-accent))] text-white">
                            {convo.user1?.username?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Avatar className="h-7 w-7 border-2 border-[hsl(var(--forum-bg))]">
                          <AvatarImage src={convo.user2?.avatar_url || undefined} />
                          <AvatarFallback className="text-[9px] bg-[hsl(var(--forum-accent))] text-white">
                            {convo.user2?.username?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link href={`/user/${convo.user1?.username}`} onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-[hsl(var(--forum-accent))] hover:underline truncate">
                            {convo.user1?.username}
                          </Link>
                          {convo.user1?.role && getRoleBadge(convo.user1.role)}
                          <span className="text-[10px] forum-text-muted">↔</span>
                          <Link href={`/user/${convo.user2?.username}`} onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-[hsl(var(--forum-accent))] hover:underline truncate">
                            {convo.user2?.username}
                          </Link>
                          {convo.user2?.role && getRoleBadge(convo.user2.role)}
                        </div>
                        <span className="text-[10px] forum-text-muted">
                          {convo.last_message_at && formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 forum-text-muted flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="forum-surface border-[hsl(var(--forum-border))] flex-1 flex flex-col hidden sm:flex">
            {selectedConvo ? (
              <>
                <CardHeader className="pb-2 border-b border-[hsl(var(--forum-border))]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
                      Conversación entre{' '}
                      <Link href={`/user/${selectedConvo.user1?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline">
                        @{selectedConvo.user1?.username}
                      </Link>
                      {' '}y{' '}
                      <Link href={`/user/${selectedConvo.user2?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline">
                        @{selectedConvo.user2?.username}
                      </Link>
                    </CardTitle>
                    <Badge className="bg-[hsl(var(--forum-accent))]/20 text-[hsl(var(--forum-accent))]">
                      {messages.length} mensajes
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <p className="text-center py-8 forum-text-muted text-sm">Cargando mensajes...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center py-8 forum-text-muted text-sm">No hay mensajes en esta conversación</p>
                  ) : (
                    messages.map((msg) => {
                      const isUser1 = msg.sender_id === selectedConvo.user1_id;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isUser1 ? '' : 'flex-row-reverse'}`}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarImage src={msg.sender?.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] bg-[hsl(var(--forum-accent))] text-white">
                              {msg.sender?.username?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[70%] ${isUser1 ? '' : 'text-right'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <Link href={`/user/${msg.sender?.username}`}
                                className="text-xs font-medium text-[hsl(var(--forum-accent))] hover:underline">
                                {msg.sender?.username}
                              </Link>
                              {msg.sender?.role && getRoleBadge(msg.sender.role)}
                              <span className="text-[10px] forum-text-muted">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: dateLocale })}
                              </span>
                            </div>
                            <div className={`inline-block rounded-lg px-3 py-2 text-sm ${
                              isUser1
                                ? 'bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))]'
                                : 'bg-[hsl(var(--forum-accent))]/10 border border-[hsl(var(--forum-accent))]/20'
                            }`}>
                              <div dangerouslySetInnerHTML={{ __html: msg.content }} className="prose prose-sm max-w-none break-words [&>*]:m-0" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 forum-text-muted opacity-30" />
                  <h3 className="text-lg font-semibold forum-text-muted mb-1">Selecciona una conversación</h3>
                  <p className="text-sm forum-text-muted">Elige una conversación de la lista para ver los mensajes</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
