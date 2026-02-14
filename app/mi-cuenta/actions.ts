'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
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
