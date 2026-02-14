'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'post' | 'thread' | 'user';
  targetId: string;
};

const MODAL_REASON_KEYS = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'] as const;
const MODAL_REASON_VALUES = ['spam', 'inappropriate', 'harassment', 'false_info', 'other'];

export function ReportModal({ isOpen, onClose, type, targetId }: ReportModalProps) {
  const { user } = useAuth();
  const t = useTranslations('report');
  const tc = useTranslations('common');
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t('loginToReport'));
      return;
    }

    if (reason === 'other' && details.trim().length === 0) {
      toast.error(t('selectReasonError'));
      return;
    }

    setLoading(true);

    try {
      const reportData: Record<string, string | null> = {
        reporter_id: user.id,
        reason,
        details: details.trim() || null,
        status: 'pending',
      };

      if (type === 'post') {
        reportData.post_id = targetId;
      } else if (type === 'thread') {
        reportData.thread_id = targetId;
      } else if (type === 'user') {
        reportData.reported_user_id = targetId;
      }

      const { error } = await supabase.from('reports').insert(reportData);

      if (error) {
        toast.error(t('errorSending'), {
          description: error.message,
        });
      } else {
        toast.success(t('reportSuccess'), {
          description: t('reportSuccessDesc'),
        });
        onClose();
        setReason('spam');
        setDetails('');
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reportContent')}</DialogTitle>
          <DialogDescription>
            {t('helpCommunity')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>{t('reasonLabel')}</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {MODAL_REASON_KEYS.map((key, i) => (
                  <div key={MODAL_REASON_VALUES[i]} className="flex items-center space-x-2">
                    <RadioGroupItem value={MODAL_REASON_VALUES[i]} id={MODAL_REASON_VALUES[i]} />
                    <Label htmlFor={MODAL_REASON_VALUES[i]} className="font-normal cursor-pointer">
                      {t(key)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {reason === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="details">{t('additionalDetails')}</Label>
                <Textarea
                  id="details"
                  placeholder={t('detailsPlaceholder')}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={loading}
                  rows={4}
                  required
                />
              </div>
            )}

            {reason !== 'other' && (
              <div className="space-y-2">
                <Label htmlFor="details">{t('additionalDetails')}</Label>
                <Textarea
                  id="details"
                  placeholder={t('detailsPlaceholder')}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? t('sending') : t('sendReport')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
