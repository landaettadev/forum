'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface ReportButtonProps {
  targetUserId: string;
  postId?: string;
  threadId?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'icon';
}

const REASON_KEYS = ['spam', 'harassment', 'inappropriate', 'fake', 'scam', 'other'] as const;
const REASON_VALUES = ['spam', 'harassment', 'inappropriate', 'fake', 'scam', 'other'];

export function ReportButton({ 
  targetUserId, 
  postId, 
  threadId, 
  variant = 'ghost',
  size = 'sm'
}: ReportButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('report');
  const tc = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: targetUserId,
      post_id: postId || null,
      thread_id: threadId || null,
      reason,
      details: details || null,
      status: 'pending'
    });

    if (error) {
      toast.error(t('errorSending'));
    } else {
      toast.success(t('reportSuccess'), {
        description: t('reportSuccessDesc')
      });
      setIsOpen(false);
      setReason('');
      setDetails('');
    }

    setIsSubmitting(false);
  };

  if (!user || user.id === targetUserId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="text-red-500 hover:text-red-600">
          <Flag className="h-4 w-4" />
          {size !== 'icon' && <span className="ml-1">{t('report')}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reportContent')}</DialogTitle>
          <DialogDescription>
            {t('helpCommunity')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REASON_KEYS.map((key, i) => (
              <div key={REASON_VALUES[i]} className="flex items-center space-x-2">
                <RadioGroupItem value={REASON_VALUES[i]} id={REASON_VALUES[i]} />
                <Label htmlFor={REASON_VALUES[i]} className="cursor-pointer">{t(key)}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="details">{t('additionalDetails')}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t('detailsPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {tc('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || isSubmitting}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isSubmitting ? t('sending') : t('sendReport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
