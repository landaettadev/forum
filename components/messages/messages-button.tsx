'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export function MessagesButton() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_unread_messages_count', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    fetchUnreadCount();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/mensajes">
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[hsl(var(--forum-accent))] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
