'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  FileText,
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentWithInvoice = {
  id: string;
  reference_code: string;
  amount_usd: number;
  status: string;
  payment_method: string;
  proof_url: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  booking_id: string;
  invoice: {
    id: string;
    invoice_number: string;
    description: string;
    issued_at: string;
  } | null;
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  submitted: Clock,
  confirmed: CheckCircle,
  rejected: XCircle,
  cancelled: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
  cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

export default function UserPaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('payments');

  const [payments, setPayments] = useState<PaymentWithInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('id, reference_code, amount_usd, status, payment_method, proof_url, submitted_at, rejection_reason, created_at, booking_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch invoices for confirmed payments
      const enriched: PaymentWithInvoice[] = [];
      for (const p of paymentsData || []) {
        let invoice = null;
        if (p.status === 'confirmed') {
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('id, invoice_number, description, issued_at')
            .eq('payment_id', p.id)
            .maybeSingle();
          invoice = invoiceData;
        }
        enriched.push({ ...p, invoice });
      }

      setPayments(enriched);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchPayments();
  }, [user, fetchPayments]);

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> {t('back')}
      </Button>

      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <CreditCard className="h-7 w-7" /> {t('myPayments')}
      </h1>
      <p className="forum-text-secondary mb-6">{t('myPaymentsDesc')}</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto forum-text-muted mb-4" />
            <p className="forum-text-muted">{t('noPaymentsYet')}</p>
            <Button
              onClick={() => router.push('/publicidad')}
              className="mt-4 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
            >
              {t('buyAd')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => {
            const StatusIcon = STATUS_ICONS[p.status] || Clock;
            return (
              <Card key={p.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold">{p.reference_code}</code>
                        <Badge className={cn('text-xs', STATUS_COLORS[p.status] || '')}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t(`status_${p.status}`)}
                        </Badge>
                      </div>
                      <div className="text-sm forum-text-muted">
                        {p.payment_method} · {new Date(p.created_at).toLocaleDateString()}
                      </div>
                      {p.rejection_reason && (
                        <div className="text-sm text-red-500">
                          {t('rejectionReason')}: {p.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-lg font-bold">${p.amount_usd} USD</div>
                      <div className="flex gap-1 justify-end">
                        {p.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/publicidad/pago/${p.booking_id}`)}
                          >
                            {t('completePay')}
                          </Button>
                        )}
                        {p.invoice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/cuenta/facturas/${p.invoice!.invoice_number}`)}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            {p.invoice.invoice_number}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
