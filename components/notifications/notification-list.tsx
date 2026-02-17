'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AtSign, MessageSquare, Quote, ThumbsUp, Heart, 
  Award, TrendingUp, Mail, Bell, CheckCheck 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  actor_username: string | null;
  actor_avatar: string | null;
  created_at: string;
};

type NotificationListProps = {
  onMarkAllRead: () => void;
  onClose: () => void;
};

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  mention: <AtSign className="h-4 w-4 text-blue-500" />,
  reply: <MessageSquare className="h-4 w-4 text-green-500" />,
  quote: <Quote className="h-4 w-4 text-indigo-500" />,
  thanks: <ThumbsUp className="h-4 w-4 text-yellow-500" />,
  reaction: <Heart className="h-4 w-4 text-red-500" />,
  new_badge: <Award className="h-4 w-4 text-orange-500" />,
  reputation: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  private_message: <Mail className="h-4 w-4 text-indigo-500" />,
  thread_reply: <MessageSquare className="h-4 w-4 text-slate-400" />,
  follow: <Bell className="h-4 w-4 text-amber-600" />,
};

export function NotificationList({ onMarkAllRead, onClose }: NotificationListProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_notifications', { 
          p_user_id: user.id,
          p_limit: 20 
        });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onClose();
  };

  return (
    <div className="flex flex-col max-h-[400px]">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Notificaciones</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-7"
          onClick={onMarkAllRead}
        >
          <CheckCheck className="h-3 w-3 mr-1" />
          Marcar todas
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tienes notificaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link || '#'}
                onClick={() => handleClick(notification)}
                className={cn(
                  "flex gap-3 p-3 hover:bg-[hsl(var(--forum-surface-hover))] transition-colors",
                  !notification.is_read && "bg-[hsl(var(--forum-accent))]/5"
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.actor_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {notification.actor_username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full">
                    {NOTIFICATION_ICONS[notification.type] || <Bell className="h-3 w-3" />}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm",
                    !notification.is_read && "font-medium"
                  )}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true, 
                      locale: dateLocale 
                    })}
                  </p>
                </div>
                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--forum-accent))] flex-shrink-0 mt-2" />
                )}
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-2 border-t">
        <Link href="/notificaciones" onClick={onClose}>
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Ver todas las notificaciones
          </Button>
        </Link>
      </div>
    </div>
  );
}
