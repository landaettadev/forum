'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Clock, Plus, Edit, Trash2, Search, Ban, CheckCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface Suspension {
  id: string;
  user_id: string;
  suspended_by: string;
  reason: string;
  description: string | null;
  starts_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  is_active: boolean;
  suspension_type: 'temporary' | 'permanent' | 'super_ban';
  lifted_at: string | null;
  lifted_by: string | null;
  created_at: string;
  user?: { username: string };
  suspended_by_user?: { username: string };
}

export default function AdminSuspensionsPage() {
  const { user, profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('adminSuspensions');
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSuspension, setEditingSuspension] = useState<Suspension | null>(null);
  const [filterStatus, setFilterStatus] = useState('active');
  
  // Form state
  const [targetUsername, setTargetUsername] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [suspensionType, setSuspensionType] = useState<'temporary' | 'permanent'>('temporary');
  const [duration, setDuration] = useState(7);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.moderator_type !== 'super') {
      redirect('/');
    }
    fetchSuspensions();
  }, [profile, filterStatus]);

  const fetchSuspensions = async () => {
    setIsLoading(true);
    let query = supabase
      .from('user_suspensions')
      .select(`
        *,
        user:profiles!user_suspensions_user_id_fkey(username),
        suspended_by_user:profiles!user_suspensions_suspended_by_fkey(username)
      `)
      .order('created_at', { ascending: false });

    if (filterStatus === 'active') {
      query = query.eq('is_active', true);
    } else if (filterStatus === 'lifted') {
      query = query.eq('is_active', false);
    }

    const { data } = await query.limit(100);
    if (data) setSuspensions(data);
    setIsLoading(false);
  };

  const searchSuspensions = async () => {
    if (!searchQuery.trim()) {
      fetchSuspensions();
      return;
    }

    setIsLoading(true);
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', `%${searchQuery}%`);

    if (users && users.length > 0) {
      const userIds = users.map(u => u.id);
      const { data } = await supabase
        .from('user_suspensions')
        .select(`
          *,
          user:profiles!user_suspensions_user_id_fkey(username),
          suspended_by_user:profiles!user_suspensions_suspended_by_fkey(username)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (data) setSuspensions(data);
    } else {
      setSuspensions([]);
    }
    setIsLoading(false);
  };

  const handleAddSuspension = async () => {
    if (!targetUsername.trim() || !reason.trim()) {
      toast.error(t('userAndReasonRequired'));
      return;
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', targetUsername)
      .maybeSingle();

    if (!targetUser) {
      toast.error(t('userNotFound'));
      return;
    }

    const expiresAt = suspensionType === 'permanent' 
      ? null 
      : new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('user_suspensions').insert({
      user_id: targetUser.id,
      suspended_by: user?.id,
      reason,
      description: description || null,
      expires_at: expiresAt,
      is_permanent: suspensionType === 'permanent',
      suspension_type: suspensionType,
      is_active: true
    });

    if (error) {
      toast.error(t('errorCreating'));
      return;
    }

    // Update profile
    await supabase.from('profiles').update({
      is_suspended: true,
      suspended_until: expiresAt
    }).eq('id', targetUser.id);

    // Log moderation action
    await supabase.from('moderation_logs').insert({
      moderator_id: user?.id,
      target_user_id: targetUser.id,
      action: suspensionType === 'permanent' ? 'ban' : 'suspend',
      reason,
      details: { duration, description }
    });

    // Send notification
    await supabase.from('notifications').insert({
      user_id: targetUser.id,
      type: 'suspension',
      title: suspensionType === 'permanent' ? t('notifBanned') : t('notifSuspended'),
      message: `${t('reason')}: ${reason}. ${suspensionType === 'temporary' ? `${t('durationLabel')}: ${duration} ${t('days')}` : t('permanentAction')}`,
    });

    toast.success(t('created'));
    setShowAddDialog(false);
    resetForm();
    fetchSuspensions();
  };

  const handleUpdateSuspension = async () => {
    if (!editingSuspension) return;

    const { error } = await supabase
      .from('user_suspensions')
      .update({
        reason,
        description: description || null
      })
      .eq('id', editingSuspension.id);

    if (error) {
      toast.error(t('errorUpdating'));
      return;
    }

    toast.success(t('updated'));
    setEditingSuspension(null);
    resetForm();
    fetchSuspensions();
  };

  const handleLiftSuspension = async (suspension: Suspension) => {
    const { error } = await supabase
      .from('user_suspensions')
      .update({
        is_active: false,
        lifted_at: new Date().toISOString(),
        lifted_by: user?.id
      })
      .eq('id', suspension.id);

    if (error) {
      toast.error(t('errorLifting'));
      return;
    }

    // Update profile
    await supabase.from('profiles').update({
      is_suspended: false,
      suspended_until: null
    }).eq('id', suspension.user_id);

    // Log moderation action
    await supabase.from('moderation_logs').insert({
      moderator_id: user?.id,
      target_user_id: suspension.user_id,
      action: 'unsuspend',
      reason: t('liftedManually')
    });

    toast.success(t('liftedSuccess'));
    fetchSuspensions();
  };

  const handleDeleteSuspension = async (suspensionId: string, userId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const { error } = await supabase
      .from('user_suspensions')
      .delete()
      .eq('id', suspensionId);

    if (error) {
      toast.error(t('errorDeleting'));
      return;
    }

    // Check if user has other active suspensions
    const { count } = await supabase
      .from('user_suspensions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (count === 0) {
      await supabase.from('profiles').update({
        is_suspended: false,
        suspended_until: null
      }).eq('id', userId);
    }

    toast.success(t('deleted'));
    fetchSuspensions();
  };

  const resetForm = () => {
    setTargetUsername('');
    setReason('');
    setDescription('');
    setSuspensionType('temporary');
    setDuration(7);
  };

  const openEditDialog = (suspension: Suspension) => {
    setEditingSuspension(suspension);
    setReason(suspension.reason);
    setDescription(suspension.description || '');
  };

  const canManageSuspensions = profile?.role === 'admin' || profile?.moderator_type === 'super';

  if (!canManageSuspensions) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              {t('title')}
            </h1>
            <p className="forum-text-secondary">{t('description')}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">{t('backToPanel')}</Button>
            </Link>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('newSuspension')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('newSuspension')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">{t('user')}</label>
                    <Input
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      placeholder={t('usernamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('type')}</label>
                    <Select value={suspensionType} onValueChange={(v: any) => setSuspensionType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temporary">{t('temporary')}</SelectItem>
                        <SelectItem value="permanent">{t('permanentBan')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {suspensionType === 'temporary' && (
                    <div>
                      <label className="text-sm font-medium">{t('durationDays')}</label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 7)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">{t('reason')}</label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('reasonPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('descriptionLabel')}</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                      placeholder={t('descriptionPlaceholder')}
                      maxLength={200}
                    />
                    <span className="text-xs forum-text-muted">{description.length}/200</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('cancel')}</Button>
                  <Button onClick={handleAddSuspension}>{t('createSuspension')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="forum-surface border-[hsl(var(--forum-border))]">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 forum-text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchSuspensions()}
                  placeholder={t('searchPlaceholder')}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('filterActive')}</SelectItem>
                  <SelectItem value="lifted">{t('filterLifted')}</SelectItem>
                  <SelectItem value="all">{t('filterAll')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={searchSuspensions}>{t('search')}</Button>
            </div>
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
                    <TableHead></TableHead>
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
                      <TableCell className="max-w-xs">
                        <div className="truncate">{suspension.reason}</div>
                        {suspension.description && (
                          <div className="text-xs forum-text-muted truncate">{suspension.description}</div>
                        )}
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
                      <TableCell className="text-sm">
                        @{suspension.suspended_by_user?.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(suspension)}
                            title={t('edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {suspension.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() => handleLiftSuspension(suspension)}
                              title={t('liftSuspension')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {profile?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleDeleteSuspension(suspension.id, suspension.user_id)}
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingSuspension} onOpenChange={(open) => !open && setEditingSuspension(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editSuspension')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">{t('reason')}</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('descriptionLabel')}</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  maxLength={200}
                />
                <span className="text-xs forum-text-muted">{description.length}/200</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSuspension(null)}>{t('cancel')}</Button>
              <Button onClick={handleUpdateSuspension}>{t('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Footer />
    </div>
  );
}
