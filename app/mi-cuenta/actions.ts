'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateData, updateProfileSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { success: false; error: string };

export async function updateProfile(data: {
  bio?: string;
  signature?: string;
  location_country?: string;
  location_city?: string;
  avatar_url?: string;
}): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    const validation = validateData(updateProfileSchema, data);
    if (!validation.success) {
      const firstError = Object.values(validation.errors).flat()[0];
      return { success: false, error: firstError || 'Datos inválidos' };
    }

    const { bio, signature, location_country, location_city, avatar_url } = validation.data;

    const updateData: Record<string, string> = {};
    if (bio !== undefined) updateData.bio = bio;
    if (signature !== undefined) updateData.signature = signature;
    if (location_country !== undefined) updateData.location_country = location_country;
    if (location_city !== undefined) updateData.location_city = location_city;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/mi-cuenta');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return { success: false, error: message };
  }
}

export async function updateNotificationSettings(data: {
  notify_replies: boolean;
  notify_mentions: boolean;
  notify_messages: boolean;
  notify_follows: boolean;
  notify_email_replies: boolean;
  notify_email_messages: boolean;
}): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Authentication required' };

    const { error } = await supabase
      .from('profiles')
      .update({
        notify_replies: data.notify_replies,
        notify_mentions: data.notify_mentions,
        notify_messages: data.notify_messages,
        notify_follows: data.notify_follows,
        notify_email_replies: data.notify_email_replies,
        notify_email_messages: data.notify_email_messages,
      })
      .eq('id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/mi-cuenta');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return { success: false, error: message };
  }
}

export async function updatePrivacySettings(data: {
  privacy_show_online: boolean;
  privacy_show_activity: boolean;
  privacy_show_profile: boolean;
  privacy_allow_messages: 'everyone' | 'verified' | 'nobody';
}): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Authentication required' };

    const allowedValues = ['everyone', 'verified', 'nobody'];
    if (!allowedValues.includes(data.privacy_allow_messages)) {
      return { success: false, error: 'Valor inválido para mensajes privados' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        privacy_show_online: data.privacy_show_online,
        privacy_show_activity: data.privacy_show_activity,
        privacy_show_profile: data.privacy_show_profile,
        privacy_allow_messages: data.privacy_allow_messages,
      })
      .eq('id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/mi-cuenta');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return { success: false, error: message };
  }
}

export async function submitVerificationRequest(data: {
  verification_type: 'escort' | 'moderator';
  photo_url?: string;
  code?: string;
  full_name?: string;
  contact_info?: string;
  experience?: string;
  languages?: string[];
  region_id?: string;
  motivation?: string;
  availability?: string;
}): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Authentication required' };

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('verifications')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Ya tienes una solicitud de verificación pendiente' };
    }

    // Validate based on type
    if (data.verification_type === 'escort') {
      if (!data.photo_url?.trim()) {
        return { success: false, error: 'La foto de verificación es obligatoria' };
      }
      if (!data.code?.trim()) {
        return { success: false, error: 'El código de verificación es obligatorio' };
      }
    } else if (data.verification_type === 'moderator') {
      if (!data.motivation?.trim()) {
        return { success: false, error: 'La motivación es obligatoria' };
      }
      if (!data.experience?.trim()) {
        return { success: false, error: 'La experiencia es obligatoria' };
      }
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      verification_type: data.verification_type,
      status: 'pending',
    };

    if (data.photo_url) insertData.photo_url = data.photo_url;
    if (data.code) insertData.code = data.code;
    if (data.full_name) insertData.full_name = data.full_name;
    if (data.contact_info) insertData.contact_info = data.contact_info;
    if (data.experience) insertData.experience = data.experience;
    if (data.languages?.length) insertData.languages = data.languages;
    if (data.region_id) insertData.region_id = data.region_id;
    if (data.motivation) insertData.motivation = data.motivation;
    if (data.availability) insertData.availability = data.availability;

    const { error } = await supabase.from('verifications').insert(insertData);

    if (error) return { success: false, error: error.message };

    // Notify admins via supabaseAdmin
    try {
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins?.length) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          type: 'system',
          content: `Nueva solicitud de verificación (${data.verification_type}) de @${user.email?.split('@')[0] || 'usuario'}`,
          link: '/admin',
        }));
        await supabaseAdmin.from('notifications').insert(notifications);
      }
    } catch {
      // Non-critical: don't fail the request if notification fails
    }

    revalidatePath('/mi-cuenta');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return { success: false, error: message };
  }
}
