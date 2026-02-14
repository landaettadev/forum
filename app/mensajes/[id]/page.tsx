'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import { ChatView } from '@/components/messages/chat-view';

export default function ConversationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const targetId = params?.id as string;
  const t = useTranslations('messages');

  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const init = async () => {
      // targetId could be a conversation UUID or a user UUID
      // First try to find as a conversation
      const { data: convCheck } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', targetId)
        .maybeSingle();

      if (convCheck) {
        // It's a conversation ID — fetch other user info
        setConversationId(targetId);
        const { data: convData } = await supabase
          .rpc('get_user_conversations', { p_user_id: user.id });
        if (convData && Array.isArray(convData)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const conv = convData.find((c: any) => c.conversation_id === targetId);
          if (conv) {
            setOtherUser({
              id: conv.other_user_id,
              username: conv.other_user_username,
              avatar_url: conv.other_user_avatar,
            });
          }
        }
      } else {
        // Assume it's a user ID — get or create conversation
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', targetId)
          .maybeSingle();

        if (!profile) {
          router.push('/mensajes');
          return;
        }

        setOtherUser(profile);

        const { data: newConvId } = await supabase
          .rpc('get_or_create_conversation', {
            p_user_id: user.id,
            p_other_user_id: targetId,
          });

        if (newConvId) {
          setConversationId(newConvId);
        } else {
          router.push('/mensajes');
          return;
        }
      }

      setLoading(false);
    };

    init();
  }, [user, targetId, router]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6 w-full">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-[hsl(var(--forum-accent))] border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <Breadcrumbs
          items={[
            { label: t('title'), href: '/mensajes' },
            { label: otherUser?.username || '...' },
          ]}
        />

        <div className="forum-surface" style={{ height: 'calc(100vh - 16rem)' }}>
          {conversationId && otherUser ? (
            <ChatView
              conversationId={conversationId}
              otherUser={otherUser}
              onBack={() => router.push('/mensajes')}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t('selectConversation')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
