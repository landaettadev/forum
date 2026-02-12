'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a payment record for a booking
 */
export async function createPayment(bookingId: string, paymentMethod: string): Promise<ActionResult<{ paymentId: string; referenceCode: string }>> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Login required' };
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('banner_bookings')
      .select('id, user_id, price_usd, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (booking.user_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (booking.status !== 'pending') {
      return { success: false, error: 'Booking is not in pending status' };
    }

    // Check if payment already exists for this booking
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, reference_code, status')
      .eq('booking_id', bookingId)
      .not('status', 'in', '("cancelled","rejected")')
      .maybeSingle();

    if (existingPayment) {
      return { success: true, data: { paymentId: existingPayment.id, referenceCode: existingPayment.reference_code } };
    }

    // Generate reference code
    const { data: refCode } = await supabase.rpc('generate_payment_reference');
    const referenceCode = refCode || `TF-${Date.now()}`;

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: user.id,
        amount_usd: booking.price_usd,
        payment_method: paymentMethod,
        status: 'pending',
        reference_code: referenceCode,
      })
      .select('id, reference_code')
      .single();

    if (paymentError || !payment) {
      console.error('Error creating payment:', paymentError);
      return { success: false, error: 'Error creating payment' };
    }

    revalidatePath('/publicidad');
    return { success: true, data: { paymentId: payment.id, referenceCode: payment.reference_code } };
  } catch (error) {
    console.error('Unexpected error in createPayment:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Submit payment proof (user uploads receipt/hash)
 */
export async function submitPaymentProof(
  paymentId: string,
  proofUrl: string | null,
  proofNotes: string
): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Login required' };
    }

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'submitted',
        proof_url: proofUrl,
        proof_notes: proofNotes,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error submitting proof:', error);
      return { success: false, error: 'Error submitting payment proof' };
    }

    revalidatePath('/publicidad');
    revalidatePath('/admin/payments');
    return { success: true, data: null };
  } catch (error) {
    console.error('Unexpected error in submitPaymentProof:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Admin: confirm a payment
 */
export async function adminConfirmPayment(
  paymentId: string,
  adminNotes?: string
): Promise<ActionResult<{ invoiceNumber: string }>> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Login required' };
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('confirm_payment', {
      p_payment_id: paymentId,
      p_admin_id: user.id,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      console.error('Error confirming payment:', error);
      return { success: false, error: 'Error confirming payment' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    revalidatePath('/admin/payments');
    revalidatePath('/admin/ads');
    return { success: true, data: { invoiceNumber: data.invoice_number } };
  } catch (error) {
    console.error('Unexpected error in adminConfirmPayment:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Admin: reject a payment
 */
export async function adminRejectPayment(
  paymentId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Login required' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('reject_payment', {
      p_payment_id: paymentId,
      p_admin_id: user.id,
      p_reason: reason,
    });

    if (error) {
      console.error('Error rejecting payment:', error);
      return { success: false, error: 'Error rejecting payment' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    revalidatePath('/admin/payments');
    revalidatePath('/admin/ads');
    return { success: true, data: null };
  } catch (error) {
    console.error('Unexpected error in adminRejectPayment:', error);
    return { success: false, error: 'Unexpected error' };
  }
}
