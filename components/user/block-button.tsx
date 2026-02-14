'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ban, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

type BlockButtonProps = {
  userId: string;
  username: string;
  onBlockChange?: (isBlocked: boolean) => void;
};

export function BlockButton({ userId, username, onBlockChange }: BlockButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('user');
  const tc = useTranslations('common');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkBlockStatus = useCallback(async () => {
    const { data } = await supabase
      .rpc('is_user_blocked', { p_user_id: userId });
    setIsBlocked(!!data);
  }, [userId]);

  useEffect(() => {
    if (user && user.id !== userId) {
      checkBlockStatus();
    }
  }, [user, userId, checkBlockStatus]);

  const toggleBlock = async () => {
    if (!user) {
      toast.error(t('mustLoginToBlock'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('toggle_user_block', { p_blocked_id: userId });

      if (error) throw error;

      if (data?.success) {
        setIsBlocked(data.blocked);
        onBlockChange?.(data.blocked);
        toast.success(data.blocked 
          ? t('blocked', { username }) 
          : t('unblocked', { username })
        );
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error(t('blockError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.id === userId) {
    return null;
  }

  if (isBlocked) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleBlock}
        disabled={isLoading}
        className="text-muted-foreground"
      >
        <UserX className="h-4 w-4 mr-2" />
        {t('unblock')}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-red-500"
          disabled={!user}
        >
          <Ban className="h-4 w-4 mr-2" />
          {t('block')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('blockConfirmTitle', { username })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('blockConfirmDesc')}
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('blockEffect1')}</li>
              <li>{t('blockEffect2')}</li>
              <li>{t('blockEffect3')}</li>
              <li>{t('blockEffect4')}</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={toggleBlock}
            className="bg-red-500 hover:bg-red-600"
          >
            {t('block')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
