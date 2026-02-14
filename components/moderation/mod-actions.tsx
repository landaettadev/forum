'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Trash2, Lock, Unlock, Ban, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface ModActionsProps {
  targetUserId: string;
  postId?: string;
  threadId?: string;
  onAction?: () => void;
}

export function ModActions({ targetUserId, postId, threadId, onAction }: ModActionsProps) {
  const { user, profile } = useAuth();
  const tc = useTranslations('common');
  const t = useTranslations('moderation');
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDays, setSuspendDays] = useState('7');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isMod = profile?.role === 'mod' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  if (!user || !isMod) return null;

  const logAction = async (action: string, details?: Record<string, unknown>) => {
    await supabase.from('moderation_logs').insert({
      moderator_id: user.id,
      target_user_id: targetUserId,
      target_post_id: postId || null,
      target_thread_id: threadId || null,
      action,
      reason,
      details
    });
  };

  const handleDeletePost = async () => {
    if (!postId) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('posts')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: user.id 
      })
      .eq('id', postId);

    if (!error) {
      await logAction('delete_post');
      toast.success(t('postDeleted'));
      onAction?.();
    } else {
      toast.error(t('postDeleteError'));
    }

    setIsLoading(false);
    setDeleteDialogOpen(false);
  };

  const handleDeleteThread = async () => {
    if (!threadId) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('threads')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: user.id 
      })
      .eq('id', threadId);

    if (!error) {
      await logAction('delete_thread');
      toast.success(t('threadDeleted'));
      onAction?.();
    } else {
      toast.error(t('threadDeleteError'));
    }

    setIsLoading(false);
    setDeleteDialogOpen(false);
  };

  const handleLockThread = async (lock: boolean) => {
    if (!threadId) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('threads')
      .update({ is_locked: lock })
      .eq('id', threadId);

    if (!error) {
      await logAction(lock ? 'lock_thread' : 'unlock_thread');
      toast.success(lock ? t('threadLocked') : t('threadUnlocked'));
      onAction?.();
    } else {
      toast.error(t('threadModError'));
    }

    setIsLoading(false);
  };

  const handleSuspendUser = async () => {
    if (!reason) {
      toast.error(t('provideReason'));
      return;
    }
    setIsLoading(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(suspendDays));

    const { error: suspensionError } = await supabase
      .from('user_suspensions')
      .insert({
        user_id: targetUserId,
        suspended_by: user.id,
        reason,
        expires_at: expiresAt.toISOString(),
        is_permanent: false,
        is_active: true
      });

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        is_suspended: true,
        suspended_until: expiresAt.toISOString()
      })
      .eq('id', targetUserId);

    if (!suspensionError && !profileError) {
      await logAction('suspend', { days: parseInt(suspendDays) });
      toast.success(t('userSuspended', { days: suspendDays }));
      onAction?.();
    } else {
      toast.error(t('suspendError'));
    }

    setIsLoading(false);
    setSuspendDialogOpen(false);
    setReason('');
  };

  const handleBanUser = async () => {
    if (!isAdmin) {
      toast.error(t('adminOnlyBan'));
      return;
    }
    if (!reason) {
      toast.error(t('provideReason'));
      return;
    }
    setIsLoading(true);

    const { error: suspensionError } = await supabase
      .from('user_suspensions')
      .insert({
        user_id: targetUserId,
        suspended_by: user.id,
        reason,
        is_permanent: true,
        is_active: true
      });

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        is_suspended: true,
        suspended_until: null
      })
      .eq('id', targetUserId);

    if (!suspensionError && !profileError) {
      await logAction('ban');
      toast.success(t('userBanned'));
      onAction?.();
    } else {
      toast.error(t('banError'));
    }

    setIsLoading(false);
    setSuspendDialogOpen(false);
    setReason('');
  };

  const handleDeleteUserContent = async () => {
    if (!isAdmin) {
      toast.error(t('adminOnlyDelete'));
      return;
    }
    setIsLoading(true);

    await supabase
      .from('posts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('author_id', targetUserId);

    await supabase
      .from('threads')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('author_id', targetUserId);

    await logAction('delete_user', { deleted_all_content: true });
    toast.success(t('allContentDeleted'));
    onAction?.();

    setIsLoading(false);
  };

  const handleToggleLinks = async (canPost: boolean) => {
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ can_post_links: canPost })
      .eq('id', targetUserId);

    if (!error) {
      await logAction(canPost ? 'promote' : 'demote', { can_post_links: canPost });
      toast.success(canPost ? t('linksAllowed') : t('linksForbidden'));
      onAction?.();
    } else {
      toast.error(t('permissionError'));
    }

    setIsLoading(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-[hsl(var(--forum-mod))]">
            <Shield className="h-4 w-4 mr-1" />
            Mod
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {postId && (
            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-500">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deletePost')}
            </DropdownMenuItem>
          )}
          
          {threadId && (
            <>
              <DropdownMenuItem onClick={() => handleLockThread(true)}>
                <Lock className="h-4 w-4 mr-2" />
                {t('lockThread')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLockThread(false)}>
                <Unlock className="h-4 w-4 mr-2" />
                {t('unlockThread')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-500">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteThread')}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setSuspendDialogOpen(true)}>
            <Clock className="h-4 w-4 mr-2" />
            {t('suspendUser')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleToggleLinks(false)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t('prohibitLinks')}
          </DropdownMenuItem>

          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBanUser} className="text-red-500">
                <Ban className="h-4 w-4 mr-2" />
                {t('banPermanently')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteUserContent} className="text-red-500">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteAllContent')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('suspendTitle')}</DialogTitle>
            <DialogDescription>
              {t('suspendDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('durationDays')}</Label>
              <Input
                type="number"
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
                min="1"
                max="365"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('reason')}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSuspendUser} disabled={isLoading || !reason}>
              {isLoading ? t('processing') : t('suspend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('reasonOptional')}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('deleteReasonPlaceholder')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button 
              onClick={postId ? handleDeletePost : handleDeleteThread} 
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {isLoading ? tc('deleting') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
