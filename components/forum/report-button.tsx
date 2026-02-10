'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

type ReportButtonProps = {
  targetType: 'post' | 'thread' | 'user' | 'message';
  targetId: string;
  size?: 'sm' | 'default';
};

const REPORT_REASON_KEYS = ['spam', 'harassment', 'inappropriate', 'offTopic', 'duplicate', 'misinformation', 'illegal', 'other'] as const;
const REPORT_REASON_VALUES = ['spam', 'harassment', 'inappropriate', 'off_topic', 'duplicate', 'misinformation', 'illegal', 'other'];

export function ReportButton({ targetType, targetId, size = 'sm' }: ReportButtonProps) {
  const { user } = useAuth();
  const t = useTranslations('report');
  const tc = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t('loginToReport'));
      return;
    }

    if (!reason) {
      toast.error(t('selectReasonError'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .rpc('create_report', {
          p_target_type: targetType,
          p_target_id: targetId,
          p_reason: reason,
          p_description: description || null
        });

      if (error) throw error;

      if (data?.success) {
        toast.success(t('reportSent'));
        setIsOpen(false);
        setReason('');
        setDescription('');
      } else if (data?.error === 'Already reported') {
        toast.error(t('alreadyReported'));
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error(t('errorSending'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetLabel = () => {
    switch (targetType) {
      case 'post': return t('reportPost');
      case 'thread': return t('reportThread');
      case 'user': return t('reportUser');
      case 'message': return t('reportMessage');
      default: return t('reportContent');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'sm' : 'default'}
          className="text-muted-foreground hover:text-red-500"
          disabled={!user}
        >
          <Flag className="h-4 w-4" />
          {size !== 'sm' && <span className="ml-2">{t('report')}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTargetLabel()}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('reasonLabel')}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASON_KEYS.map((key, i) => (
                  <SelectItem key={REPORT_REASON_VALUES[i]} value={REPORT_REASON_VALUES[i]}>
                    {t(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('additionalDetails')}</Label>
            <Textarea
              id="description"
              placeholder={t('detailsPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            disabled={isSubmitting || !reason}
            className="bg-red-500 hover:bg-red-600"
          >
            {isSubmitting ? t('sending') : t('sendReport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
