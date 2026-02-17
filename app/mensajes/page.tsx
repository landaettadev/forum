'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatView } from '@/components/messages/chat-view';
import { cn } from '@/lib/utils';

type UserResult = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function MensajesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('messages');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<UserResult | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  // Handle ?to= parameter to auto-start conversation
  const handleToParam = useCallback(async (targetUsername: string) => {
    if (!user || initializedFromUrl) return;
    
    setInitializedFromUrl(true);
    
    // Find the user by username
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', targetUsername)
      .single();
    
    if (targetUser && targetUser.id !== user.id) {
      // Get or create conversation
      const { data: conversationId } = await supabase
        .rpc('get_or_create_conversation', {
          p_user_id: user.id,
          p_other_user_id: targetUser.id
        });
      
      if (conversationId) {
        setOtherUser(targetUser);
        setSelectedConversation(conversationId);
      }
    }
  }, [user, initializedFromUrl]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check for ?to= parameter
    const toUsername = searchParams?.get('to');
    if (toUsername && !initializedFromUrl) {
      handleToParam(toUsername);
    }
  }, [user, router, searchParams, handleToParam, initializedFromUrl]);

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    
    // Fetch other user info from conversations list
    const { data } = await supabase
      .rpc('get_user_conversations', { p_user_id: user?.id });
    
    if (data && Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conv = data.find((c: any) => c.conversation_id === conversationId);
      if (conv) {
        setOtherUser({
          id: conv.other_user_id,
          username: conv.other_user_username,
          avatar_url: conv.other_user_avatar
        });
      }
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Escape special LIKE pattern characters to prevent pattern injection
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&');

    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${escapedQuery}%`)
      .neq('id', user?.id)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const handleStartConversation = async (targetUser: UserResult) => {
    if (!user) return;

    const { data: conversationId } = await supabase
      .rpc('get_or_create_conversation', {
        p_user_id: user.id,
        p_other_user_id: targetUser.id
      });

    if (conversationId) {
      setOtherUser(targetUser);
      setSelectedConversation(conversationId);
      setShowNewMessage(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <Breadcrumbs items={[{ label: t('title') }]} />

        <div className="forum-surface h-[calc(100vh-200px)] flex overflow-hidden">
          {/* Conversation list - hidden on mobile when chat is open */}
          <div className={cn(
            "w-full md:w-80 border-r border-[hsl(var(--forum-border))] flex-shrink-0",
            selectedConversation && "hidden md:block"
          )}>
            <ConversationList
              selectedId={selectedConversation || undefined}
              onSelect={handleSelectConversation}
              onNewMessage={() => setShowNewMessage(true)}
            />
          </div>

          {/* Chat view */}
          <div className={cn(
            "flex-1 flex flex-col",
            !selectedConversation && "hidden md:flex"
          )}>
            {selectedConversation && otherUser ? (
              <ChatView
                conversationId={selectedConversation}
                otherUser={otherUser}
                onBack={() => setSelectedConversation(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>{t('selectConversation')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New message dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newMessage')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder={t('searchUsers')}
                className="pl-9"
              />
            </div>

            {searching && (
              <div className="text-center py-4 text-muted-foreground">
                {t('searching')}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="divide-y divide-[hsl(var(--forum-border))] max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleStartConversation(result)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatar_url || undefined} />
                      <AvatarFallback>{result.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{result.username}</span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                {t('noUsersFound')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
