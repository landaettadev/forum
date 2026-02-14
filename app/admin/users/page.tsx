'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { escapeLikePattern } from '@/lib/sanitize';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, MoreVertical, Shield, Ban, Clock, Eye, Trash2, CheckCircle, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  is_vip: boolean;
  is_suspended: boolean;
  posts_count: number;
  created_at: string;
  last_seen_at: string | null;
}

interface UserIP {
  ip_address: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { user, profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('adminUsers');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userIPs, setUserIPs] = useState<UserIP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Suspension dialog state
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendPermanent, setSuspendPermanent] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  // Unsuspend dialog state
  const [unsuspendDialogOpen, setUnsuspendDialogOpen] = useState(false);
  const [unsuspendTarget, setUnsuspendTarget] = useState<User | null>(null);
  const [unsuspendReason, setUnsuspendReason] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      redirect('/');
    }
    fetchUsers();
  }, [profile]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setUsers(data);
    setIsLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      fetchUsers();
      return;
    }

    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${escapeLikePattern(searchQuery)}%`)
      .limit(50);

    if (data) setUsers(data);
    setIsLoading(false);
  };

  const fetchUserIPs = async (userId: string) => {
    const { data } = await supabase
      .from('user_ips')
      .select('ip_address, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setUserIPs(data);
  };

  const handleViewUser = async (u: User) => {
    setSelectedUser(u);
    await fetchUserIPs(u.id);
  };

  const logModerationAction = async (action: string, targetUserId: string, reason: string, details?: object) => {
    await supabase.from('moderation_logs').insert({
      moderator_id: user?.id,
      target_user_id: targetUserId,
      action,
      reason,
      details: details || null
    });
  };

  const openSuspendDialog = (u: User, days: number, isPermanent = false) => {
    setSuspendTarget(u);
    setSuspendDays(days);
    setSuspendPermanent(isPermanent);
    setSuspendReason('');
    setSuspendDialogOpen(true);
  };

  const handleSuspendUser = async () => {
    if (!suspendTarget) return;
    const userId = suspendTarget.id;
    const isPermanent = suspendPermanent;
    const days = suspendDays;
    const reason = suspendReason.trim() || (isPermanent ? 'Expulsión permanente' : `Suspensión por ${days} días`);

    const expiresAt = isPermanent ? null : new Date();
    if (expiresAt) expiresAt.setDate(expiresAt.getDate() + days);

    await supabase.from('user_suspensions').insert({
      user_id: userId,
      suspended_by: user?.id,
      reason,
      expires_at: expiresAt?.toISOString() || null,
      is_permanent: isPermanent,
      is_active: true
    });

    await supabase.from('profiles').update({
      is_suspended: true,
      suspended_until: expiresAt?.toISOString() || null
    }).eq('id', userId);

    await logModerationAction(
      isPermanent ? 'ban' : 'suspend', 
      userId, 
      reason
    );

    toast.success(isPermanent ? 'Usuario expulsado permanentemente' : `Usuario suspendido por ${days} días`);
    setSuspendDialogOpen(false);
    setSuspendTarget(null);
    fetchUsers();
  };

  const handleBanIP = async (ipAddress: string) => {
    await supabase.from('ip_bans').insert({
      ip_address: ipAddress,
      banned_by: user?.id,
      reason: 'Bloqueo de IP desde panel de administración',
      is_permanent: true,
      is_active: true
    });

    if (selectedUser) {
      await logModerationAction('ip_ban', selectedUser.id, `IP bloqueada: ${ipAddress}`, { ip: ipAddress });
    }

    toast.success(`IP ${ipAddress} bloqueada permanentemente`);
  };

  const handleSuperBan = async (userId: string, username: string) => {
    if (!confirm(`⚠️ SUPER EXPULSIÓN ⚠️\n\n¿Estás ABSOLUTAMENTE seguro de eliminar a @${username} y TODO su contenido?\n\nEsta acción es IRREVERSIBLE y eliminará:\n- Todos sus hilos\n- Todos sus comentarios\n- Todos sus mensajes\n- Su perfil completo`)) {
      return;
    }

    // Double confirmation
    if (!confirm('ÚLTIMA CONFIRMACIÓN: ¿Realmente deseas proceder con la super expulsión?')) {
      return;
    }

    try {
      // Delete all user content
      await supabase.from('posts').delete().eq('author_id', userId);
      await supabase.from('threads').delete().eq('author_id', userId);
      await supabase.from('chat_messages').delete().eq('sender_id', userId);
      await supabase.from('profile_posts').delete().eq('author_id', userId);
      
      // Log the super ban before deleting profile
      await logModerationAction('super_ban', userId, `Super expulsión - usuario y contenido eliminado: @${username}`);
      
      // Delete the user profile (this will cascade to other related data)
      await supabase.from('profiles').delete().eq('id', userId);

      toast.success(`@${username} y todo su contenido han sido eliminados permanentemente`);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      toast.error('Error al ejecutar super expulsión');
    }
  };

  const openUnsuspendDialog = (u: User) => {
    setUnsuspendTarget(u);
    setUnsuspendReason('');
    setUnsuspendDialogOpen(true);
  };

  const handleUnsuspendUser = async () => {
    if (!unsuspendTarget) return;
    const userId = unsuspendTarget.id;
    const reason = unsuspendReason.trim() || 'Suspensión levantada';

    await supabase.from('user_suspensions')
      .update({ is_active: false, lifted_at: new Date().toISOString(), lifted_by: user?.id })
      .eq('user_id', userId)
      .eq('is_active', true);

    await supabase.from('profiles').update({
      is_suspended: false,
      suspended_until: null
    }).eq('id', userId);

    await logModerationAction('unsuspend', userId, reason);
    toast.success('Suspensión levantada');
    setUnsuspendDialogOpen(false);
    setUnsuspendTarget(null);
    fetchUsers();
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    await supabase.from('profiles').update({ is_verified: verify }).eq('id', userId);
    await logModerationAction(verify ? 'verify' : 'unverify', userId, verify ? 'Usuario verificado' : 'Verificación removida');
    toast.success(verify ? 'Usuario verificado' : 'Verificación removida');
    fetchUsers();
  };

  const handleChangeRole = async (userId: string, newRole: string, oldRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole, moderator_type: newRole === 'mod' ? 'moderator' : null }).eq('id', userId);
    if (error) {
      toast.error('Error al cambiar rol');
      return;
    }
    await logModerationAction(
      newRole === 'mod' || newRole === 'admin' ? 'promote' : 'demote', 
      userId, 
      `Rol cambiado de ${oldRole} a ${newRole}`
    );
    toast.success(`Rol cambiado a ${newRole}`);
    fetchUsers();
  };

  const getUserInitials = (username: string) => username.substring(0, 2).toUpperCase();

  if (!profile || profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="forum-text-secondary">{t('description')}</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">{t('backToPanel')}</Button>
          </Link>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 forum-text-muted" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                      placeholder={t('searchPlaceholder')}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={searchUsers}>{t('search')}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('user')}</TableHead>
                      <TableHead>{t('role')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>{t('lastSeen')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{getUserInitials(u.username)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.username}</p>
                              <p className="text-xs forum-text-muted">
                                {t('since')} {new Date(u.created_at).toLocaleDateString(locale)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'mod' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {u.is_suspended && <Badge variant="destructive">{t('suspended')}</Badge>}
                            {u.is_verified && <Badge className="bg-[hsl(var(--forum-verified))]">{t('verified')}</Badge>}
                            {u.is_vip && <Badge className="bg-[hsl(var(--forum-vip))]">VIP</Badge>}
                            {!u.is_suspended && !u.is_verified && !u.is_vip && <span className="text-xs forum-text-muted">{t('normal')}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{u.posts_count}</TableCell>
                        <TableCell className="text-xs forum-text-muted">
                          {u.last_seen_at 
                            ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true, locale: dateLocale })
                            : t('never')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUser(u)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('viewDetails')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleVerifyUser(u.id, !u.is_verified)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {u.is_verified ? t('removeVerification') : t('verify')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(u.id, u.role === 'mod' ? 'user' : 'mod', u.role)}>
                                <Shield className="h-4 w-4 mr-2" />
                                {u.role === 'mod' ? t('removeMod') : t('makeMod')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {u.is_suspended ? (
                                <DropdownMenuItem onClick={() => openUnsuspendDialog(u)}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  {t('liftSuspension')}
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => openSuspendDialog(u, 7)}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    {t('suspend7')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openSuspendDialog(u, 30)}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    {t('suspend30')}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem 
                                className="text-red-500"
                                onClick={() => openSuspendDialog(u, 0, true)}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                {t('banPermanently')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-700 font-bold"
                                onClick={() => handleSuperBan(u.id, u.username)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('superBan')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {users.length === 0 && !isLoading && (
                  <p className="text-center forum-text-muted py-8">{t('noUsersFound')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedUser && (
            <Card className="w-80 forum-surface border-[hsl(var(--forum-border))] h-fit">
              <CardHeader>
                <CardTitle className="text-lg">{t('userDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>{getUserInitials(selectedUser.username)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedUser.username}</p>
                    <p className="text-xs forum-text-muted">{selectedUser.role}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="forum-text-muted">ID:</span>
                    <span className="font-mono text-xs">{selectedUser.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="forum-text-muted">Posts:</span>
                    <span>{selectedUser.posts_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="forum-text-muted">{t('registered')}:</span>
                    <span>{new Date(selectedUser.created_at).toLocaleDateString(locale)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[hsl(var(--forum-border))]">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t('last10IPs')}
                  </h4>
                  {userIPs.length > 0 ? (
                    <div className="space-y-2 text-xs font-mono">
                      {userIPs.map((ip, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="truncate">{ip.ip_address}</span>
                          <div className="flex items-center gap-1">
                            <span className="forum-text-muted text-[10px]">
                              {formatDistanceToNow(new Date(ip.created_at), { addSuffix: true, locale: dateLocale })}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                              onClick={() => handleBanIP(ip.ip_address)}
                              title={t('blockIP')}
                            >
                              <Globe className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs forum-text-muted">{t('noIPs')}</p>
                  )}
                </div>

                <Button variant="outline" className="w-full" onClick={() => setSelectedUser(null)}>
                  {t('close')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendPermanent 
                ? `Expulsar permanentemente a @${suspendTarget?.username}` 
                : `Suspender a @${suspendTarget?.username} por ${suspendDays} días`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="suspend-reason">Motivo / Comentario</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={suspendPermanent 
                  ? "Explica el motivo de la expulsión permanente..." 
                  : "Explica el motivo de la suspensión..."}
                rows={3}
                className="mt-1"
              />
            </div>
            {suspendPermanent && (
              <p className="text-sm text-red-500">
                ⚠️ Esta acción expulsará al usuario de forma permanente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSuspendUser}
              className={suspendPermanent ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              {suspendPermanent ? 'Expulsar' : 'Suspender'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend Dialog */}
      <Dialog open={unsuspendDialogOpen} onOpenChange={setUnsuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Levantar suspensión de @{unsuspendTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="unsuspend-reason">Motivo / Comentario</Label>
              <Textarea
                id="unsuspend-reason"
                value={unsuspendReason}
                onChange={(e) => setUnsuspendReason(e.target.value)}
                placeholder="Explica el motivo para levantar la suspensión..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsuspendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUnsuspendUser}>
              Levantar suspensión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
