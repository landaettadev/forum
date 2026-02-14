'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { escapeLikePattern } from '@/lib/sanitize';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Plus, Edit, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface Warning {
  id: string;
  user_id: string;
  issued_by: string;
  reason: string;
  description: string | null;
  points: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  user?: { username: string };
  issuer?: { username: string };
}

export default function AdminWarningsPage() {
  const { user, profile } = useAuth();
  const locale = useLocale();
  const _dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('adminWarnings');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWarning, setEditingWarning] = useState<Warning | null>(null);
  
  // Form state
  const [targetUsername, setTargetUsername] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(1);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.role !== 'mod') {
      redirect('/');
    }
    fetchWarnings();
  }, [profile]);

  const fetchWarnings = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('user_warnings')
      .select(`
        *,
        user:profiles!user_warnings_user_id_fkey(username),
        issuer:profiles!user_warnings_issued_by_fkey(username)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setWarnings(data);
    setIsLoading(false);
  };

  const searchWarnings = async () => {
    if (!searchQuery.trim()) {
      fetchWarnings();
      return;
    }

    setIsLoading(true);
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', `%${escapeLikePattern(searchQuery)}%`);

    if (users && users.length > 0) {
      const userIds = users.map(u => u.id);
      const { data } = await supabase
        .from('user_warnings')
        .select(`
          *,
          user:profiles!user_warnings_user_id_fkey(username),
          issuer:profiles!user_warnings_issued_by_fkey(username)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (data) setWarnings(data);
    } else {
      setWarnings([]);
    }
    setIsLoading(false);
  };

  const handleAddWarning = async () => {
    if (!targetUsername.trim() || !reason.trim()) {
      toast.error(t('userAndReasonRequired'));
      return;
    }

    // Find user by username
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', targetUsername)
      .maybeSingle();

    if (!targetUser) {
      toast.error(t('userNotFound'));
      return;
    }

    const { error } = await supabase.from('user_warnings').insert({
      user_id: targetUser.id,
      issued_by: user?.id,
      reason,
      description: description || null,
      points,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month
      is_active: true
    });

    if (error) {
      toast.error(t('errorCreating'));
      return;
    }

    // Send notification to user
    await supabase.from('notifications').insert({
      user_id: targetUser.id,
      type: 'warning',
      title: t('notifWarningReceived'),
      message: `${t('reason')}: ${reason}. ${description || ''}`,
      data: { points }
    });

    // Log moderation action
    await supabase.from('moderation_logs').insert({
      moderator_id: user?.id,
      target_user_id: targetUser.id,
      action: 'warn',
      reason,
      details: { points, description }
    });

    toast.success(t('sent'));
    setShowAddDialog(false);
    resetForm();
    fetchWarnings();
  };

  const handleUpdateWarning = async () => {
    if (!editingWarning) return;

    const { error } = await supabase
      .from('user_warnings')
      .update({
        reason,
        description: description || null,
        points
      })
      .eq('id', editingWarning.id);

    if (error) {
      toast.error(t('errorUpdating'));
      return;
    }

    toast.success(t('updated'));
    setEditingWarning(null);
    resetForm();
    fetchWarnings();
  };

  const handleDeleteWarning = async (warningId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const { error } = await supabase
      .from('user_warnings')
      .delete()
      .eq('id', warningId);

    if (error) {
      toast.error(t('errorDeleting'));
      return;
    }

    toast.success(t('deleted'));
    fetchWarnings();
  };

  const _handleDeactivateWarning = async (warningId: string) => {
    const { error } = await supabase
      .from('user_warnings')
      .update({ is_active: false })
      .eq('id', warningId);

    if (error) {
      toast.error(t('errorDeactivating'));
      return;
    }

    toast.success(t('deactivated'));
    fetchWarnings();
  };

  const resetForm = () => {
    setTargetUsername('');
    setReason('');
    setDescription('');
    setPoints(1);
  };

  const openEditDialog = (warning: Warning) => {
    setEditingWarning(warning);
    setReason(warning.reason);
    setDescription(warning.description || '');
    setPoints(warning.points);
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'mod')) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
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
                  {t('newWarning')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('newWarning')}</DialogTitle>
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
                  <div>
                    <label className="text-sm font-medium">{t('points')}</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('cancel')}</Button>
                  <Button onClick={handleAddWarning}>{t('sendWarning')}</Button>
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
                  onKeyDown={(e) => e.key === 'Enter' && searchWarnings()}
                  placeholder={t('searchPlaceholder')}
                  className="pl-9"
                />
              </div>
              <Button onClick={searchWarnings}>{t('search')}</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
            ) : warnings.length === 0 ? (
              <p className="text-center py-8 forum-text-muted">{t('noWarnings')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('user')}</TableHead>
                    <TableHead>{t('reason')}</TableHead>
                    <TableHead>{t('points')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('expires')}</TableHead>
                    <TableHead>{t('issuedBy')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warnings.map((warning) => (
                    <TableRow key={warning.id}>
                      <TableCell>
                        <Link 
                          href={`/usuaria/${warning.user?.username}`}
                          className="text-[hsl(var(--forum-accent))] hover:underline"
                        >
                          @{warning.user?.username}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{warning.reason}</div>
                        {warning.description && (
                          <div className="text-xs forum-text-muted truncate">{warning.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{warning.points} pts</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={warning.is_active ? 'bg-yellow-500' : 'bg-gray-500'}>
                          {warning.is_active ? t('active') : t('expired')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm forum-text-muted">
                        {format(new Date(warning.expires_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        @{warning.issuer?.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(warning)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {profile.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleDeleteWarning(warning.id)}
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
        <Dialog open={!!editingWarning} onOpenChange={(open) => !open && setEditingWarning(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editWarning')}</DialogTitle>
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
              <div>
                <label className="text-sm font-medium">{t('points')}</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingWarning(null)}>{t('cancel')}</Button>
              <Button onClick={handleUpdateWarning}>{t('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Footer />
    </div>
  );
}
