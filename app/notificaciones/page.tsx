'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '@/lib/notifications';
import { Bell, Check, CheckCheck, Trash2, Loader2, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

export default function NotificacionesPage() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations('notifications');
  const _tc = useTranslations('common');
  const dateLocale = getDateFnsLocale(locale);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getNotifications(user.id, 50, filter === 'unread');
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    const success = await markAsRead(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const success = await markAllAsRead(user.id);
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success(t('allMarkedRead'));
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteNotification(id);
    if (success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(t('deleted'));
    }
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      reply: '💬',
      mention: '👤',
      follow: '👥',
      like: '❤️',
      message: '✉️',
      verification_approved: '✅',
      verification_rejected: '❌',
      suspension: '🚫',
      warning: '⚠️',
      system: '📢',
    };
    return icons[type] || '🔔';
  };

  const getLink = (notification: Notification): string => {
    const data = notification.data || {};
    switch (notification.type) {
      case 'reply':
      case 'mention':
      case 'like':
        return data.threadId ? `/hilo/${data.threadId}` : '#';
      case 'message':
        return '/mensajes';
      case 'follow':
        return data.followerUsername ? `/usuaria/${data.followerUsername}` : '#';
      default:
        return '#';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 forum-text-muted" />
            <h2 className="text-2xl font-bold mb-2">{t('loginRequired')}</h2>
            <p className="forum-text-secondary mb-4">
              {t('loginRequiredDesc')}
            </p>
            <Button asChild>
              <Link href="/login">{t('loginButton')}</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-6 w-full flex-1">
        <Breadcrumbs items={[{ label: t('title') }]} />

        <div className="forum-surface p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-[hsl(var(--forum-accent))]" />
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                  {t('unread', { count: unreadCount })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {t('markAll')}
                </Button>
              )}
              <Link href="/mi-cuenta">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {t('all')}
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter('unread');
                loadNotifications();
              }}
            >
              {t('unreadFilter')}
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto forum-text-muted" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center forum-text-muted">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">{t('noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative p-4 rounded-lg border transition-colors ${
                    notification.is_read
                      ? 'bg-transparent border-[hsl(var(--forum-border))]'
                      : 'bg-[hsl(var(--forum-accent))]/5 border-[hsl(var(--forum-accent))]/20'
                  }`}
                >
                  <Link href={getLink(notification)} className="block">
                    <div className="flex gap-4">
                      <div className="text-2xl flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold mb-1">{notification.title}</p>
                        <p className="text-sm forum-text-secondary line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs forum-text-muted mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-3 h-3 rounded-full bg-[hsl(var(--forum-accent))] flex-shrink-0" />
                      )}
                    </div>
                  </Link>

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          handleMarkAsRead(notification.id);
                        }}
                        title={t('markAsRead')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(notification.id);
                      }}
                      title={t('deleteNotif')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
