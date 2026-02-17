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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  History, Shield, Trash2, Lock, Ban, Clock, AlertTriangle, Edit, Pin, Globe,
  UserX, User, Image as ImageIcon, FileText, MessageSquare, Eye, RotateCcw,
  Search, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Mail
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

/* ─── Types ─── */

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  target_title: string | null;
  target_url: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: { username: string; avatar_url: string | null };
}

interface DeletedThread {
  id: string;
  title: string;
  author_id: string;
  forum_id: string;
  deleted_at: string;
  deleted_by: string | null;
  delete_reason: string | null;
  created_at: string;
  author?: { username: string };
  deleted_by_user?: { username: string };
  forum?: { name: string; slug: string };
}

interface DeletedPost {
  id: string;
  content: string;
  author_id: string;
  thread_id: string;
  deleted_at: string;
  deleted_by: string | null;
  delete_reason: string | null;
  created_at: string;
  author?: { username: string };
  deleted_by_user?: { username: string };
  thread?: { id: string; title: string };
}

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

/* ─── Action Labels ─── */

const auditActionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  thread_create: { label: 'Nuevo hilo', color: 'bg-green-600', icon: <FileText className="h-3.5 w-3.5" /> },
  thread_title_edit: { label: 'Título editado', color: 'bg-blue-500', icon: <Edit className="h-3.5 w-3.5" /> },
  thread_delete: { label: 'Hilo eliminado', color: 'bg-red-500', icon: <Trash2 className="h-3.5 w-3.5" /> },
  thread_restore: { label: 'Hilo restaurado', color: 'bg-emerald-500', icon: <RotateCcw className="h-3.5 w-3.5" /> },
  thread_pin: { label: 'Hilo fijado', color: 'bg-blue-400', icon: <Pin className="h-3.5 w-3.5" /> },
  thread_unpin: { label: 'Hilo desfijado', color: 'bg-gray-500', icon: <Pin className="h-3.5 w-3.5" /> },
  thread_lock: { label: 'Hilo bloqueado', color: 'bg-orange-500', icon: <Lock className="h-3.5 w-3.5" /> },
  thread_unlock: { label: 'Hilo desbloqueado', color: 'bg-green-500', icon: <Lock className="h-3.5 w-3.5" /> },
  post_create: { label: 'Nueva respuesta', color: 'bg-green-500', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  post_edit: { label: 'Post editado', color: 'bg-blue-500', icon: <Edit className="h-3.5 w-3.5" /> },
  post_delete: { label: 'Post eliminado', color: 'bg-red-500', icon: <Trash2 className="h-3.5 w-3.5" /> },
  post_restore: { label: 'Post restaurado', color: 'bg-emerald-500', icon: <RotateCcw className="h-3.5 w-3.5" /> },
  profile_bio_edit: { label: 'Bio editada', color: 'bg-purple-500', icon: <User className="h-3.5 w-3.5" /> },
  profile_signature_edit: { label: 'Firma editada', color: 'bg-purple-400', icon: <FileText className="h-3.5 w-3.5" /> },
  profile_avatar_change: { label: 'Foto de perfil', color: 'bg-indigo-500', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  profile_username_change: { label: 'Cambio de usuario', color: 'bg-amber-500', icon: <User className="h-3.5 w-3.5" /> },
  profile_role_change: { label: 'Cambio de rol', color: 'bg-red-600', icon: <Shield className="h-3.5 w-3.5" /> },
  profile_verified: { label: 'Verificado', color: 'bg-emerald-500', icon: <Shield className="h-3.5 w-3.5" /> },
  profile_unverified: { label: 'Des-verificado', color: 'bg-gray-500', icon: <Shield className="h-3.5 w-3.5" /> },
};

const modActionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
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

/* ─── Main Component ─── */

export default function AdminLogsPage() {
  const { profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('adminLogs');

  // State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [modLogs, setModLogs] = useState<ModerationLog[]>([]);
  const [deletedThreads, setDeletedThreads] = useState<DeletedThread[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([]);
  const [suspensions, setSuspensions] = useState<UserSuspension[]>([]);
  const [ipBans, setIpBans] = useState<IpBan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile && !['admin', 'mod'].includes(profile.role)) {
      redirect('/');
    }
    if (profile) fetchAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const results = await Promise.all([
      supabase.from('audit_logs').select('*, user:profiles!audit_logs_user_id_fkey(username, avatar_url)')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('moderation_logs').select('*, moderator:profiles!moderation_logs_moderator_id_fkey(username), target_user:profiles!moderation_logs_target_user_id_fkey(username)')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('threads').select('*, author:profiles!threads_author_id_fkey(username), forum:forums(name, slug)')
        .not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(50),
      supabase.from('posts').select('*, author:profiles!posts_author_id_fkey(username), thread:threads(id, title)')
        .not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(50),
      supabase.from('user_suspensions').select('*, user:profiles!user_suspensions_user_id_fkey(username), suspended_by_user:profiles!user_suspensions_suspended_by_fkey(username)')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('ip_bans').select('*, banned_by_user:profiles!ip_bans_banned_by_fkey(username)')
        .order('created_at', { ascending: false }).limit(50),
    ]);

    if (results[0].data) setAuditLogs(results[0].data as AuditLog[]);
    if (results[1].data) setModLogs(results[1].data as ModerationLog[]);
    if (results[2].data) setDeletedThreads(results[2].data as DeletedThread[]);
    if (results[3].data) setDeletedPosts(results[3].data as DeletedPost[]);
    if (results[4].data) setSuspensions(results[4].data as UserSuspension[]);
    if (results[5].data) setIpBans(results[5].data as IpBan[]);
    setIsLoading(false);
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const restoreThread = async (threadId: string) => {
    const { error } = await supabase.from('threads')
      .update({ deleted_at: null, deleted_by: null, delete_reason: null })
      .eq('id', threadId);
    if (error) { toast.error('Error restaurando hilo'); return; }
    toast.success('Hilo restaurado');
    fetchAllData();
  };

  const restorePost = async (postId: string) => {
    const { error } = await supabase.from('posts')
      .update({ deleted_at: null, deleted_by: null, delete_reason: null })
      .eq('id', postId);
    if (error) { toast.error('Error restaurando post'); return; }
    toast.success('Post restaurado');
    fetchAllData();
  };

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditFilter !== 'all' && log.action_type !== auditFilter) return false;
    if (auditSearch) {
      const search = auditSearch.toLowerCase();
      return (
        log.user?.username?.toLowerCase().includes(search) ||
        log.target_title?.toLowerCase().includes(search) ||
        log.action_type.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (!profile || !['admin', 'mod'].includes(profile.role)) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
              <History className="h-7 w-7 text-[hsl(var(--forum-accent))]" />
              Centro de Auditoría
            </h1>
            <p className="forum-text-secondary text-sm">Control total de actividad de usuarios y moderación</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/messages">
              <Button variant="outline" className="gap-2"><Mail className="h-4 w-4" /> Ver Mensajes</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline">{t('backToPanel')}</Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm">
              <Eye className="h-3.5 w-3.5" /> Actividad ({auditLogs.length})
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5" /> Moderación ({modLogs.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="gap-1.5 text-xs sm:text-sm">
              <Trash2 className="h-3.5 w-3.5" /> Eliminados ({deletedThreads.length + deletedPosts.length})
            </TabsTrigger>
            <TabsTrigger value="suspensions" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" /> Suspensiones ({suspensions.filter(s => s.is_active).length})
            </TabsTrigger>
            <TabsTrigger value="ipbans" className="gap-1.5 text-xs sm:text-sm">
              <Globe className="h-3.5 w-3.5" /> IP Bans ({ipBans.filter(b => b.is_active).length})
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB: User Activity Audit ─── */}
          <TabsContent value="audit">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                    Actividad de Usuarios
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar usuario o acción..." value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)} className="pl-9 w-48 h-9" />
                    </div>
                    <Select value={auditFilter} onValueChange={setAuditFilter}>
                      <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las acciones</SelectItem>
                        <SelectItem value="thread_create">Nuevos hilos</SelectItem>
                        <SelectItem value="thread_title_edit">Edición de título</SelectItem>
                        <SelectItem value="thread_delete">Hilos eliminados</SelectItem>
                        <SelectItem value="post_create">Nuevas respuestas</SelectItem>
                        <SelectItem value="post_edit">Posts editados</SelectItem>
                        <SelectItem value="post_delete">Posts eliminados</SelectItem>
                        <SelectItem value="profile_bio_edit">Edición de bio</SelectItem>
                        <SelectItem value="profile_signature_edit">Edición de firma</SelectItem>
                        <SelectItem value="profile_avatar_change">Cambio de avatar</SelectItem>
                        <SelectItem value="profile_username_change">Cambio de username</SelectItem>
                        <SelectItem value="profile_role_change">Cambio de rol</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchAllData} className="h-9">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 forum-text-muted">Cargando...</p>
                ) : filteredAuditLogs.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">No hay registros de auditoría. Ejecuta AUDIT_LOG_SYSTEM.sql primero.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredAuditLogs.map((log) => {
                      const info = auditActionLabels[log.action_type] || { label: log.action_type, color: 'bg-gray-500', icon: <Eye className="h-3.5 w-3.5" /> };
                      const isExpanded = expandedRows.has(log.id);
                      return (
                        <div key={log.id} className="border border-[hsl(var(--forum-border))] rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer"
                            onClick={() => (log.old_value || log.new_value) && toggleRow(log.id)}>
                            <span className="text-[11px] forum-text-muted w-28 flex-shrink-0">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
                            </span>
                            <Link href={`/user/${log.user?.username}`} onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium text-[hsl(var(--forum-accent))] hover:underline flex-shrink-0 w-28 truncate">
                              @{log.user?.username}
                            </Link>
                            <Badge className={`${info.color} text-white gap-1 text-[10px] px-1.5 py-0.5 flex-shrink-0`}>
                              {info.icon}{info.label}
                            </Badge>
                            {log.target_title && log.target_url ? (
                              <Link href={log.target_url} onClick={(e) => e.stopPropagation()}
                                className="text-xs truncate hover:text-[hsl(var(--forum-accent))] transition-colors flex items-center gap-1 flex-1 min-w-0">
                                {log.target_title} <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                              </Link>
                            ) : log.target_title ? (
                              <span className="text-xs truncate flex-1 min-w-0 forum-text-muted">{log.target_title}</span>
                            ) : <span className="flex-1" />}
                            {(log.old_value || log.new_value) && (
                              isExpanded ? <ChevronUp className="h-4 w-4 forum-text-muted flex-shrink-0" /> : <ChevronDown className="h-4 w-4 forum-text-muted flex-shrink-0" />
                            )}
                          </div>
                          {isExpanded && (log.old_value || log.new_value) && (
                            <div className="px-3 pb-3 pt-1 bg-[hsl(var(--forum-surface-alt))] border-t border-[hsl(var(--forum-border))]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {log.old_value && (
                                  <div>
                                    <span className="font-semibold text-red-400 block mb-1">Antes:</span>
                                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                      {log.old_value}
                                    </div>
                                  </div>
                                )}
                                {log.new_value && (
                                  <div>
                                    <span className="font-semibold text-green-400 block mb-1">Después:</span>
                                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                      {log.new_value}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: Moderation History ─── */}
          <TabsContent value="moderation">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader><CardTitle>{t('last100Actions')}</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : modLogs.length === 0 ? (
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
                      {modLogs.map((log) => {
                        const actionInfo = modActionLabels[log.action] || { label: log.action, color: 'bg-gray-500', icon: <Shield className="h-4 w-4" /> };
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm forum-text-muted">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
                            </TableCell>
                            <TableCell>
                              <Link href={`/user/${log.moderator?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline">
                                @{log.moderator?.username}
                              </Link>
                            </TableCell>
                            <TableCell><Badge className={`${actionInfo.color} text-white gap-1`}>{actionInfo.icon}{actionInfo.label}</Badge></TableCell>
                            <TableCell>
                              <Link href={`/user/${log.target_user?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline">
                                @{log.target_user?.username}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm forum-text-muted">{log.reason || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: Deleted Content (Restore) ─── */}
          <TabsContent value="deleted">
            <div className="space-y-6">
              <Card className="forum-surface border-[hsl(var(--forum-border))]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-400" /> Hilos Eliminados ({deletedThreads.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {deletedThreads.length === 0 ? (
                    <p className="text-center py-6 forum-text-muted">No hay hilos eliminados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Autor</TableHead>
                          <TableHead>Foro</TableHead>
                          <TableHead>Eliminado</TableHead>
                          <TableHead>Razón</TableHead>
                          <TableHead>Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedThreads.map((thread) => (
                          <TableRow key={thread.id}>
                            <TableCell className="font-medium text-sm max-w-[200px] truncate">{thread.title}</TableCell>
                            <TableCell>
                              <Link href={`/user/${thread.author?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline text-sm">
                                @{thread.author?.username}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm forum-text-muted">{thread.forum?.name || '-'}</TableCell>
                            <TableCell className="text-xs forum-text-muted">
                              {thread.deleted_at && formatDistanceToNow(new Date(thread.deleted_at), { addSuffix: true, locale: dateLocale })}
                            </TableCell>
                            <TableCell className="text-xs forum-text-muted max-w-[150px] truncate">{thread.delete_reason || '-'}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => restoreThread(thread.id)}>
                                <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="forum-surface border-[hsl(var(--forum-border))]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-400" /> Posts Eliminados ({deletedPosts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {deletedPosts.length === 0 ? (
                    <p className="text-center py-6 forum-text-muted">No hay posts eliminados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contenido</TableHead>
                          <TableHead>Autor</TableHead>
                          <TableHead>Hilo</TableHead>
                          <TableHead>Eliminado</TableHead>
                          <TableHead>Razón</TableHead>
                          <TableHead>Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedPosts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell className="text-sm max-w-[200px] truncate">{post.content?.replace(/<[^>]*>/g, '').substring(0, 100)}</TableCell>
                            <TableCell>
                              <Link href={`/user/${post.author?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline text-sm">
                                @{post.author?.username}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {post.thread ? (
                                <Link href={`/hilo/${post.thread.id}`} className="text-xs hover:text-[hsl(var(--forum-accent))] truncate block max-w-[150px]">
                                  {post.thread.title}
                                </Link>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-xs forum-text-muted">
                              {post.deleted_at && formatDistanceToNow(new Date(post.deleted_at), { addSuffix: true, locale: dateLocale })}
                            </TableCell>
                            <TableCell className="text-xs forum-text-muted max-w-[150px] truncate">{post.delete_reason || '-'}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => restorePost(post.id)}>
                                <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── TAB: Suspensions ─── */}
          <TabsContent value="suspensions">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader><CardTitle>{t('userSuspensions')}</CardTitle></CardHeader>
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
                      {suspensions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell><Link href={`/user/${s.user?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline">@{s.user?.username}</Link></TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{s.reason}</TableCell>
                          <TableCell><Badge className={s.is_permanent ? 'bg-red-600' : 'bg-orange-500'}>{s.is_permanent ? t('permanent') : t('temporary')}</Badge></TableCell>
                          <TableCell className="text-sm forum-text-muted">{s.is_permanent ? t('never') : s.expires_at ? format(new Date(s.expires_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                          <TableCell><Badge className={s.is_active ? 'bg-red-500' : 'bg-green-500'}>{s.is_active ? t('active') : t('lifted')}</Badge></TableCell>
                          <TableCell><Link href={`/user/${s.suspended_by_user?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline text-sm">@{s.suspended_by_user?.username}</Link></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: IP Bans ─── */}
          <TabsContent value="ipbans">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader><CardTitle>{t('ipBansTitle')}</CardTitle></CardHeader>
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
                          <TableCell className="font-mono text-sm">{ban.ip_address}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{ban.reason}</TableCell>
                          <TableCell><Badge className={ban.is_permanent ? 'bg-red-600' : 'bg-orange-500'}>{ban.is_permanent ? t('permanent') : t('temporary')}</Badge></TableCell>
                          <TableCell className="text-sm forum-text-muted">{ban.is_permanent ? t('never') : ban.expires_at ? format(new Date(ban.expires_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                          <TableCell><Badge className={ban.is_active ? 'bg-red-500' : 'bg-green-500'}>{ban.is_active ? t('active') : t('lifted')}</Badge></TableCell>
                          <TableCell><Link href={`/user/${ban.banned_by_user?.username}`} className="text-[hsl(var(--forum-accent))] hover:underline text-sm">@{ban.banned_by_user?.username}</Link></TableCell>
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
