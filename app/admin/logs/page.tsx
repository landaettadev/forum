'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Shield, Trash2, Lock, Ban, Clock, AlertTriangle, Edit, Pin, Globe, UserX } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface UserSuspension {
  id: string;
  user_id: string;
  suspended_by: string;
  reason: string;
  starts_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  is_active: boolean;
  lifted_at: string | null;
  lifted_by: string | null;
  created_at: string;
  user?: { username: string };
  suspended_by_user?: { username: string };
}

interface IpBan {
  id: string;
  ip_address: string;
  banned_by: string;
  reason: string;
  starts_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  is_active: boolean;
  lifted_at: string | null;
  created_at: string;
  banned_by_user?: { username: string };
}

interface ModerationLog {
  id: string;
  moderator_id: string;
  target_user_id: string;
  target_post_id: string | null;
  target_thread_id: string | null;
  action: string;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  moderator?: { username: string };
  target_user?: { username: string };
}

const actionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  warn: { label: 'Advertencia', color: 'bg-yellow-500', icon: <AlertTriangle className="h-4 w-4" /> },
  delete_post: { label: 'Post eliminado', color: 'bg-red-500', icon: <Trash2 className="h-4 w-4" /> },
  delete_thread: { label: 'Hilo eliminado', color: 'bg-red-500', icon: <Trash2 className="h-4 w-4" /> },
  edit_post: { label: 'Post editado', color: 'bg-blue-500', icon: <Edit className="h-4 w-4" /> },
  edit_thread: { label: 'Hilo editado', color: 'bg-blue-500', icon: <Edit className="h-4 w-4" /> },
  lock_thread: { label: 'Hilo bloqueado', color: 'bg-orange-500', icon: <Lock className="h-4 w-4" /> },
  unlock_thread: { label: 'Hilo desbloqueado', color: 'bg-green-500', icon: <Lock className="h-4 w-4" /> },
  pin_thread: { label: 'Hilo fijado', color: 'bg-blue-500', icon: <Pin className="h-4 w-4" /> },
  unpin_thread: { label: 'Hilo desfijado', color: 'bg-gray-500', icon: <Pin className="h-4 w-4" /> },
  ban: { label: 'Expulsado', color: 'bg-red-600', icon: <Ban className="h-4 w-4" /> },
  unban: { label: 'Expulsión removida', color: 'bg-green-500', icon: <Ban className="h-4 w-4" /> },
  suspend: { label: 'Suspendido', color: 'bg-orange-500', icon: <Clock className="h-4 w-4" /> },
  unsuspend: { label: 'Suspensión levantada', color: 'bg-green-500', icon: <Clock className="h-4 w-4" /> },
  ip_ban: { label: 'IP bloqueada', color: 'bg-red-700', icon: <Globe className="h-4 w-4" /> },
  ip_unban: { label: 'IP desbloqueada', color: 'bg-green-500', icon: <Globe className="h-4 w-4" /> },
  verify: { label: 'Verificado', color: 'bg-blue-500', icon: <Shield className="h-4 w-4" /> },
  unverify: { label: 'Verificación removida', color: 'bg-gray-500', icon: <Shield className="h-4 w-4" /> },
  promote: { label: 'Promovido', color: 'bg-purple-500', icon: <Shield className="h-4 w-4" /> },
  demote: { label: 'Degradado', color: 'bg-gray-500', icon: <Shield className="h-4 w-4" /> },
  delete_user: { label: 'Usuario eliminado', color: 'bg-red-700', icon: <UserX className="h-4 w-4" /> },
  super_ban: { label: 'Super Expulsión', color: 'bg-red-900', icon: <Trash2 className="h-4 w-4" /> },
};

export default function AdminLogsPage() {
  const { profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('adminLogs');
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [suspensions, setSuspensions] = useState<UserSuspension[]>([]);
  const [ipBans, setIpBans] = useState<IpBan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      redirect('/');
    }
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [logsResult, suspensionsResult, ipBansResult] = await Promise.all([
      supabase
        .from('moderation_logs')
        .select(`
          *,
          moderator:profiles!moderation_logs_moderator_id_fkey(username),
          target_user:profiles!moderation_logs_target_user_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_suspensions')
        .select(`
          *,
          user:profiles!user_suspensions_user_id_fkey(username),
          suspended_by_user:profiles!user_suspensions_suspended_by_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('ip_bans')
        .select(`
          *,
          banned_by_user:profiles!ip_bans_banned_by_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    if (logsResult.data) setLogs(logsResult.data);
    if (suspensionsResult.data) setSuspensions(suspensionsResult.data);
    if (ipBansResult.data) setIpBans(ipBansResult.data);
    setIsLoading(false);
  };

  if (!profile || profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <History className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
              {t('title')}
            </h1>
            <p className="forum-text-secondary">{t('description')}</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">{t('backToPanel')}</Button>
          </Link>
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              {t('history')} ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="suspensions" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('suspensions')} ({suspensions.filter(s => s.is_active).length})
            </TabsTrigger>
            <TabsTrigger value="ipbans" className="gap-2">
              <Globe className="h-4 w-4" />
              {t('ipBans')} ({ipBans.filter(b => b.is_active).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <CardTitle>{t('last100Actions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : logs.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">{t('noActions')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('moderator')}</TableHead>
                        <TableHead>{t('action')}</TableHead>
                        <TableHead>{t('affectedUser')}</TableHead>
                        <TableHead>{t('reason')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const actionInfo = actionLabels[log.action] || { 
                          label: log.action, 
                          color: 'bg-gray-500', 
                          icon: <Shield className="h-4 w-4" /> 
                        };
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm forum-text-muted">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/usuaria/${log.moderator?.username}`}
                                className="text-[hsl(var(--forum-accent))] hover:underline"
                              >
                                @{log.moderator?.username}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${actionInfo.color} text-white gap-1`}>
                                {actionInfo.icon}
                                {actionInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/usuaria/${log.target_user?.username}`}
                                className="text-[hsl(var(--forum-accent))] hover:underline"
                              >
                                @{log.target_user?.username}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm forum-text-muted">
                              {log.reason || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suspensions">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <CardTitle>{t('userSuspensions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : suspensions.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">{t('noSuspensions')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('user')}</TableHead>
                        <TableHead>{t('reason')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('expires')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('suspendedBy')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suspensions.map((suspension) => (
                        <TableRow key={suspension.id}>
                          <TableCell>
                            <Link 
                              href={`/usuaria/${suspension.user?.username}`}
                              className="text-[hsl(var(--forum-accent))] hover:underline"
                            >
                              @{suspension.user?.username}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {suspension.reason}
                          </TableCell>
                          <TableCell>
                            <Badge className={suspension.is_permanent ? 'bg-red-600' : 'bg-orange-500'}>
                              {suspension.is_permanent ? t('permanent') : t('temporary')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm forum-text-muted">
                            {suspension.is_permanent 
                              ? t('never') 
                              : suspension.expires_at 
                                ? format(new Date(suspension.expires_at), 'dd/MM/yyyy HH:mm')
                                : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={suspension.is_active ? 'bg-red-500' : 'bg-green-500'}>
                              {suspension.is_active ? t('active') : t('lifted')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/usuaria/${suspension.suspended_by_user?.username}`}
                              className="text-[hsl(var(--forum-accent))] hover:underline text-sm"
                            >
                              @{suspension.suspended_by_user?.username}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ipbans">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <CardTitle>{t('ipBansTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : ipBans.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">{t('noIPBans')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('ipAddress')}</TableHead>
                        <TableHead>{t('reason')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('expires')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('bannedBy')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipBans.map((ban) => (
                        <TableRow key={ban.id}>
                          <TableCell className="font-mono text-sm">
                            {ban.ip_address}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {ban.reason}
                          </TableCell>
                          <TableCell>
                            <Badge className={ban.is_permanent ? 'bg-red-600' : 'bg-orange-500'}>
                              {ban.is_permanent ? t('permanent') : t('temporary')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm forum-text-muted">
                            {ban.is_permanent 
                              ? t('never') 
                              : ban.expires_at 
                                ? format(new Date(ban.expires_at), 'dd/MM/yyyy HH:mm')
                                : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={ban.is_active ? 'bg-red-500' : 'bg-green-500'}>
                              {ban.is_active ? t('active') : t('lifted')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/usuaria/${ban.banned_by_user?.username}`}
                              className="text-[hsl(var(--forum-accent))] hover:underline text-sm"
                            >
                              @{ban.banned_by_user?.username}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
