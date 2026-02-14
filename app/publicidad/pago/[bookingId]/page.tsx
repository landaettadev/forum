'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { createPayment, submitPaymentProof } from '@/app/publicidad/payment-actions';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Building2,
  Bitcoin,
  Wallet,
  MessageCircle,
  Upload,
  CheckCircle,
  Clock,
  Copy,
  ArrowLeft,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = {
  id: string;
  label: string;
  description: string;
  instructions: string;
  icon: string;
  is_active: boolean;
};

type BookingInfo = {
  id: string;
  price_usd: number;
  position: string;
  format: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: string;
  zone: { name: string } | null;
};

type PaymentInfo = {
  id: string;
  reference_code: string;
  status: string;
  payment_method: string;
  proof_url: string | null;
  proof_notes: string | null;
  submitted_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
};

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Bitcoin,
  Wallet,
  MessageCircle,
  CreditCard,
};

export default function PaymentPage({ params }: { params: { bookingId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('payments');

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofNotes, setProofNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch booking
      const { data: bookingData } = await supabase
        .from('banner_bookings')
        .select('id, price_usd, position, format, start_date, end_date, duration_days, status, zone_id')
        .eq('id', params.bookingId)
        .eq('user_id', user!.id)
        .single();

      if (!bookingData) {
        router.push('/publicidad');
        return;
      }

      // Fetch zone name
      const { data: zone } = await supabase
        .from('banner_ad_zones')
        .select('name')
        .eq('id', bookingData.zone_id)
        .single();

      setBooking({ ...bookingData, zone });

      // Fetch existing payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('id, reference_code, status, payment_method, proof_url, proof_notes, submitted_at, admin_notes, rejection_reason')
        .eq('booking_id', params.bookingId)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentData) {
        setPayment(paymentData);
        setSelectedMethod(paymentData.payment_method || '');
      }

      // Fetch payment methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      setMethods(methodsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, params.bookingId, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, params.bookingId, fetchData]);

  const handleCreatePayment = async () => {
    if (!selectedMethod) {
      toast.error(t('selectMethod'));
      return;
    }
    setCreating(true);
    try {
      const result = await createPayment(params.bookingId, selectedMethod);
      if (result.success) {
        setPayment({
          id: result.data.paymentId,
          reference_code: result.data.referenceCode,
          status: 'pending',
          payment_method: selectedMethod,
          proof_url: null,
          proof_notes: null,
          submitted_at: null,
          admin_notes: null,
          rejection_reason: null,
        });
        toast.success(t('paymentCreated'));
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!payment) return;
    if (!proofNotes && !proofFile) {
      toast.error(t('addProofOrNotes'));
      return;
    }

    setSubmittingProof(true);
    try {
      let proofUrl: string | null = null;

      // Upload proof file if exists
      if (proofFile && user) {
        const ext = proofFile.name.split('.').pop();
        const path = `payment-proofs/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, proofFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          toast.error(t('uploadError'));
          setSubmittingProof(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }

      const result = await submitPaymentProof(payment.id, proofUrl, proofNotes);
      if (result.success) {
        toast.success(t('proofSubmitted'));
        setPayment(prev => prev ? { ...prev, status: 'submitted', proof_url: proofUrl, proof_notes: proofNotes } : null);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setSubmittingProof(false);
    }
  };

  const copyReference = () => {
    if (payment?.reference_code) {
      navigator.clipboard.writeText(payment.reference_code);
      toast.success(t('referenceCopied'));
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('fileTooLarge'));
        return;
      }
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--forum-accent))]" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/publicidad')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> {t('backToAds')}
      </Button>

      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="forum-text-secondary mb-6">{t('subtitle')}</p>

      {/* Order Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> {t('orderSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="forum-text-muted">{t('zone')}:</span>
              <div className="font-medium">{booking.zone?.name || '-'}</div>
            </div>
            <div>
              <span className="forum-text-muted">{t('position')}:</span>
              <div className="font-medium">{booking.position} ({booking.format})</div>
            </div>
            <div>
              <span className="forum-text-muted">{t('dates')}:</span>
              <div className="font-medium">{booking.start_date} → {booking.end_date}</div>
            </div>
            <div>
              <span className="forum-text-muted">{t('duration')}:</span>
              <div className="font-medium">{booking.duration_days} {t('days')}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[hsl(var(--forum-border))] flex justify-between items-center">
            <span className="text-lg font-semibold">{t('total')}:</span>
            <span className="text-2xl font-bold text-[hsl(var(--forum-accent))]">${booking.price_usd} USD</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status (if payment exists) */}
      {payment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> {t('paymentStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm forum-text-muted">{t('reference')}:</div>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-bold">{payment.reference_code}</code>
                  <button onClick={copyReference} className="p-1 hover:bg-[hsl(var(--forum-surface-alt))] rounded">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <Badge className={cn('text-sm', statusColors[payment.status] || '')}>
                {t(`status_${payment.status}`)}
              </Badge>
            </div>

            {payment.status === 'confirmed' && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle className="h-5 w-5" /> {t('paymentConfirmed')}
                </div>
                <p className="text-sm forum-text-muted mt-1">{t('paymentConfirmedDesc')}</p>
              </div>
            )}

            {payment.status === 'submitted' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <Clock className="h-5 w-5" /> {t('proofUnderReview')}
                </div>
                <p className="text-sm forum-text-muted mt-1">{t('proofUnderReviewDesc')}</p>
              </div>
            )}

            {payment.status === 'rejected' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 font-medium">
                  <AlertCircle className="h-5 w-5" /> {t('paymentRejected')}
                </div>
                {payment.rejection_reason && (
                  <p className="text-sm mt-1">{t('reason')}: {payment.rejection_reason}</p>
                )}
              </div>
            )}

            {payment.admin_notes && (
              <div className="text-sm">
                <span className="forum-text-muted">{t('adminNotes')}:</span> {payment.admin_notes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select payment method (if no payment yet) */}
      {!payment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> {t('selectPaymentMethod')}
            </CardTitle>
            <CardDescription>{t('selectPaymentMethodDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {methods.map((method) => {
              const IconComponent = ICON_MAP[method.icon] || CreditCard;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border text-left transition-all flex items-start gap-4',
                    selectedMethod === method.id
                      ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                      : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                  )}
                >
                  <IconComponent className="h-6 w-6 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">{method.label}</div>
                    <div className="text-xs forum-text-muted mt-0.5">{method.description}</div>
                  </div>
                </button>
              );
            })}

            <Button
              onClick={handleCreatePayment}
              disabled={!selectedMethod || creating}
              className="w-full mt-4 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
            >
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('processing')}</> : t('continueToPayment')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Payment instructions + proof upload (if payment is pending) */}
      {payment && payment.status === 'pending' && (
        <>
          {/* Instructions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('paymentInstructions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[hsl(var(--forum-surface-alt))] rounded-lg text-sm whitespace-pre-wrap">
                {methods.find(m => m.id === payment.payment_method)?.instructions || t('contactAdmin')}
              </div>
              <div className="mt-3 text-sm">
                <strong>{t('importantNote')}:</strong> {t('includeReference', { ref: payment.reference_code })}
              </div>
            </CardContent>
          </Card>

          {/* Submit proof */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> {t('submitProof')}
              </CardTitle>
              <CardDescription>{t('submitProofDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('proofNotes')}</Label>
                <Textarea
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder={t('proofNotesPlaceholder')}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>{t('proofFile')}</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofFileChange}
                  className="mt-1"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {proofPreview && proofFile?.type.startsWith('image/') && (
                  <img src={proofPreview} alt="Proof" className="mt-2 max-h-40 rounded-lg border" />
                )}
                {proofFile && (
                  <p className="text-xs forum-text-muted mt-1">{proofFile.name} — {(proofFile.size / 1024).toFixed(1)}KB</p>
                )}
              </div>

              <Button
                onClick={handleSubmitProof}
                disabled={submittingProof || (!proofNotes && !proofFile)}
                className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
              >
                {submittingProof
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('submitting')}</>
                  : <><Upload className="h-4 w-4 mr-2" /> {t('submitProofBtn')}</>
                }
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
