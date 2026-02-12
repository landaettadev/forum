'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { adminConfirmPayment, adminRejectPayment } from '@/app/publicidad/payment-actions';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentRow = {
  id: string;
  reference_code: string;
  amount_usd: number;
  status: string;
  payment_method: string;
  proof_url: string | null;
  proof_notes: string | null;
  submitted_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  user: { username: string; avatar_url: string | null } | null;
  booking: {
    id: string;
    position: string;
    format: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    status: string;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
  refunded: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const t = useTranslations('adminPayments');

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'confirm' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchPayments();
  }, [user, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select(`
          id, reference_code, amount_usd, status, payment_method,
          proof_url, proof_notes, submitted_at, admin_notes, rejection_reason, created_at,
          user_id, booking_id
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user and booking details
      const enriched: PaymentRow[] = [];
      for (const p of data || []) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', p.user_id)
          .single();

        const { data: bookingData } = await supabase
          .from('banner_bookings')
          .select('id, position, format, start_date, end_date, duration_days, status')
          .eq('id', p.booking_id)
          .single();

        enriched.push({
          ...p,
          user: userData,
          booking: bookingData,
        });
      }

      setPayments(enriched);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      const result = await adminConfirmPayment(selectedPayment.id, adminNotes);
      if (result.success) {
        toast.success(`${t('paymentConfirmed')} — ${t('invoice')}: ${result.data.invoiceNumber}`);
        setDialogMode(null);
        fetchPayments();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) {
      toast.error(t('provideReason'));
      return;
    }
    setProcessing(true);
    try {
      const result = await adminRejectPayment(selectedPayment.id, rejectReason);
      if (result.success) {
        toast.success(t('paymentRejected'));
        setDialogMode(null);
        fetchPayments();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.reference_code.toLowerCase().includes(q) ||
      p.user?.username.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q)
    );
  });

  const stats = {
    pending: payments.filter(p => p.status === 'pending').length,
    submitted: payments.filter(p => p.status === 'submitted').length,
    confirmed: payments.filter(p => p.status === 'confirmed').length,
    total: payments.reduce((sum, p) => p.status === 'confirmed' ? sum + Number(p.amount_usd) : sum, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="forum-text-secondary">{t('subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm forum-text-muted">{t('pendingPayments')}</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm forum-text-muted">{t('awaitingReview')}</div>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm forum-text-muted">{t('confirmed')}</div>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm forum-text-muted">{t('totalRevenue')}</div>
            <div className="text-2xl font-bold text-[hsl(var(--forum-accent))]">${stats.total.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('statusPending')}</SelectItem>
            <SelectItem value="submitted">{t('statusSubmitted')}</SelectItem>
            <SelectItem value="confirmed">{t('statusConfirmed')}</SelectItem>
            <SelectItem value="rejected">{t('statusRejected')}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Payments table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center forum-text-muted">
            {t('noPayments')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((p) => (
            <Card key={p.id} className={cn(
              'transition-all',
              p.status === 'submitted' && 'ring-2 ring-blue-500/30'
            )}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-sm">{p.reference_code}</code>
                        <Badge className={cn('text-xs', STATUS_COLORS[p.status] || '')}>
                          {t(`status_${p.status}`)}
                        </Badge>
                      </div>
                      <div className="text-sm forum-text-muted mt-1">
                        @{p.user?.username || '?'} — {p.payment_method} — {new Date(p.created_at).toLocaleDateString()}
                      </div>
                      {p.booking && (
                        <div className="text-xs forum-text-muted">
                          {p.booking.position} ({p.booking.format}) · {p.booking.start_date} → {p.booking.end_date}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">${p.amount_usd}</span>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedPayment(p); setDialogMode('view'); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {(p.status === 'pending' || p.status === 'submitted') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => { setSelectedPayment(p); setAdminNotes(''); setDialogMode('confirm'); }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => { setSelectedPayment(p); setRejectReason(''); setDialogMode('reject'); }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={dialogMode === 'view'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('paymentDetails')}</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="forum-text-muted">{t('reference')}:</span><br /><strong>{selectedPayment.reference_code}</strong></div>
                <div><span className="forum-text-muted">{t('amount')}:</span><br /><strong>${selectedPayment.amount_usd} USD</strong></div>
                <div><span className="forum-text-muted">{t('user')}:</span><br /><strong>@{selectedPayment.user?.username}</strong></div>
                <div><span className="forum-text-muted">{t('method')}:</span><br /><strong>{selectedPayment.payment_method}</strong></div>
              </div>
              {selectedPayment.proof_notes && (
                <div>
                  <span className="forum-text-muted">{t('proofNotes')}:</span>
                  <p className="mt-1 p-2 bg-[hsl(var(--forum-surface-alt))] rounded">{selectedPayment.proof_notes}</p>
                </div>
              )}
              {selectedPayment.proof_url && (
                <div>
                  <span className="forum-text-muted">{t('proofFile')}:</span>
                  <a href={selectedPayment.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[hsl(var(--forum-accent))] mt-1">
                    <ExternalLink className="h-4 w-4" /> {t('viewProof')}
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={dialogMode === 'confirm'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmPaymentTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm forum-text-muted">{t('confirmPaymentDesc', { ref: selectedPayment?.reference_code || '' })}</p>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder={t('adminNotesPlaceholder')}
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>{t('cancel')}</Button>
            <Button onClick={handleConfirm} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" /> {t('confirmBtn')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogMode === 'reject'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rejectPaymentTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm forum-text-muted">{t('rejectPaymentDesc')}</p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('rejectReasonPlaceholder')}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>{t('cancel')}</Button>
            <Button onClick={handleReject} disabled={processing || !rejectReason.trim()} variant="destructive">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" /> {t('rejectBtn')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
