'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  type Notification,
} from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface NotificationsDropdownProps {
  userId: string;
}

export function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const locale = useLocale();
  const tc = useTranslations('common');
  const dateLocale = getDateFnsLocale(locale);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId, 10),
        getUnreadCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Cargar al montar y cuando se abre
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  // Suscripción en tiempo real
  useEffect(() => {
    const channel = subscribeToNotifications(userId, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Toast de notificación
      toast.info(newNotification.title, {
        description: newNotification.message,
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // Marcar como leída
  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead(userId);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      toast.success(tc('allNotificationsRead'));
    }
  };

  // Eliminar notificación
  const handleDelete = async (notificationId: string) => {
    const success = await deleteNotification(notificationId);
    if (success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success(tc('notificationDeleted'));
    }
  };

  // Obtener icono según tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return '💬';
      case 'mention':
        return '👤';
      case 'follow':
        return '👥';
      case 'like':
        return '❤️';
      case 'message':
        return '✉️';
      case 'verification_approved':
        return '✅';
      case 'verification_rejected':
        return '❌';
      case 'suspension':
        return '🚫';
      case 'warning':
        return '⚠️';
      case 'system':
        return '📢';
      default:
        return '🔔';
    }
  };

  // Obtener link según tipo de notificación
  const getNotificationLink = (notification: Notification): string => {
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'reply':
      case 'mention':
      case 'like':
        return data.threadId ? `/hilo/${data.threadId}` : '#';
      case 'message':
        return '/mensajes';
      case 'follow':
        return data.followerId ? `/user/${data.followerUsername}` : '#';
      default:
        return '#';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[400px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--forum-border))]">
          <h3 className="font-semibold text-lg">{tc('notifications')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {tc('markAllAsRead')}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin forum-text-muted" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 forum-text-muted">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{tc('noNotifications')}</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative px-4 py-3 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors border-b border-[hsl(var(--forum-border))] last:border-0 ${
                    !notification.is_read ? 'bg-[hsl(var(--forum-accent))]/5' : ''
                  }`}
                >
                  <Link
                    href={getNotificationLink(notification)}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id);
                      }
                      setOpen(false);
                    }}
                    className="block"
                  >
                    <div className="flex gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs forum-text-secondary line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs forum-text-muted mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--forum-accent))] flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </Link>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title={tc('markAsRead')}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      title={tc('delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notificaciones"
                className="w-full text-center py-2 font-semibold text-[hsl(var(--forum-accent))]"
              >
                {tc('viewAllNotifications')}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
