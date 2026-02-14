'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Bell, MessageSquare, Heart, UserPlus, AtSign, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const tc = useTranslations('common');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-[hsl(var(--forum-accent))]" />;
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    const data = notification.data || {};
    switch (notification.type) {
      case 'reply':
      case 'mention':
      case 'quote':
        return data.thread_id ? `/hilo/${data.thread_id}` : '#';
      case 'follow':
        return data.follower_username ? `/usuaria/${data.follower_username}` : '#';
      case 'message':
        return data.sender_id ? `/mensajes/${data.sender_id}` : '/mensajes';
      default:
        return '#';
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--forum-border))]">
          <span className="font-semibold text-sm">Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                asChild
                className={`p-0 ${!notification.is_read ? 'bg-[hsl(var(--forum-accent-muted))]' : ''}`}
              >
                <Link
                  href={getNotificationLink(notification)}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className="flex items-start gap-3 px-3 py-3 w-full cursor-pointer"
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notification.title && (
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                    )}
                    {notification.message && (
                      <p className="text-xs forum-text-muted line-clamp-2">{notification.message}</p>
                    )}
                    <p className="text-[10px] forum-text-muted mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--forum-accent))] mt-2" />
                  )}
                </Link>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 mx-auto forum-text-muted mb-2" />
              <p className="text-sm forum-text-muted">{tc('noNotifications')}</p>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/notificaciones" className="text-sm text-[hsl(var(--forum-accent))]">
                {tc('viewAllNotifications')}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
