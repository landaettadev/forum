'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, error: 'Authentication required' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'mod')) {
    return { supabase: null, error: 'Insufficient permissions' };
  }

  return { supabase, user, profile, error: null };
}

export async function approveVerification(id: string, userId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (error || !supabase) return { success: false, error: error || 'Unknown error' };

  const { error: verError } = await supabase
    .from('verifications')
    .update({ status: 'approved', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (verError) return { success: false, error: verError.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', userId);

  if (profileError) return { success: false, error: profileError.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function rejectVerification(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (error || !supabase) return { success: false, error: error || 'Unknown error' };

  const { error: verError } = await supabase
    .from('verifications')
    .update({ status: 'rejected', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (verError) return { success: false, error: verError.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function resolveReport(id: string): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (error || !supabase) return { success: false, error: error || 'Unknown error' };

  const { error: reportError } = await supabase
    .from('reports')
    .update({ status: 'resolved', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (reportError) return { success: false, error: reportError.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function fetchAdminData() {
  const { supabase, error } = await requireAdmin();
  if (error || !supabase) return null;

  const [
    { count: usersCount },
    { count: reportsCount },
    { count: verificationsCount },
    { data: reportsData },
    { data: verificationsData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
    supabase.from('verifications').select('*, user:profiles(username, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
  ]);

  return {
    stats: {
      users: usersCount || 0,
      reports: reportsCount || 0,
      verifications: verificationsCount || 0,
    },
    reports: reportsData || [],
    verifications: verificationsData || [],
  };
}
