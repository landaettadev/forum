/**
 * Sistema de notificaciones en tiempo real con Supabase
 */

import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 
  | 'reply'
  | 'mention'
  | 'quote'
  | 'follow'
  | 'like'
  | 'message'
  | 'verification_approved'
  | 'verification_rejected'
  | 'suspension'
  | 'warning'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * Crear una notificación
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use provided client, or supabaseAdmin (service_role) to bypass RLS
    // since notifications are typically created for OTHER users.
    const db = client || supabaseAdmin;
    const { error } = await db
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: false,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Obtener notificaciones de un usuario
 */
export async function getNotifications(
  userId: string,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []) as Notification[];
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

/**
 * Marcar notificación como leída
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

/**
 * Eliminar notificación
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

/**
 * Contar notificaciones no leídas
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error counting unread notifications:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Unexpected error:', error);
    return 0;
  }
}

/**
 * Suscribirse a notificaciones en tiempo real
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        onNotification(payload.new as unknown as Notification);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Desuscribirse de notificaciones
 */
export async function unsubscribeFromNotifications(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}

/**
 * Helper: Notificar cuando alguien responde a tu hilo
 */
export async function notifyThreadReply(
  threadOwnerId: string,
  replyAuthorUsername: string,
  threadTitle: string,
  threadId: string,
  client?: SupabaseClient
): Promise<void> {
  await createNotification(
    threadOwnerId,
    'reply',
    'Nueva respuesta en tu hilo',
    `${replyAuthorUsername} respondió a "${threadTitle}"`,
    { threadId, replyAuthorUsername },
    client
  );
}

/**
 * Helper: Notificar mención de usuario
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionerUsername: string,
  postId: string,
  threadId: string,
  client?: SupabaseClient
): Promise<void> {
  await createNotification(
    mentionedUserId,
    'mention',
    'Te mencionaron',
    `${mentionerUsername} te mencionó en un post`,
    { postId, threadId, mentionerUsername },
    client
  );
}

/**
 * Helper: Notificar nuevo seguidor
 */
export async function notifyNewFollower(
  userId: string,
  followerUsername: string,
  followerId: string
): Promise<void> {
  await createNotification(
    userId,
    'follow',
    'Nuevo seguidor',
    `${followerUsername} comenzó a seguirte`,
    { followerId, followerUsername }
  );
}

/**
 * Helper: Notificar agradecimiento en post
 */
export async function notifyPostThanks(
  postAuthorId: string,
  thankerUsername: string,
  postId: string,
  threadId: string
): Promise<void> {
  await createNotification(
    postAuthorId,
    'like',
    'Gracias recibidos',
    `A ${thankerUsername} le gustó tu post`,
    { postId, threadId, thankerUsername }
  );
}

/**
 * Helper: Notificar mensaje privado
 */
export async function notifyPrivateMessage(
  recipientId: string,
  senderUsername: string,
  messageId: string
): Promise<void> {
  await createNotification(
    recipientId,
    'message',
    'Nuevo mensaje privado',
    `Tienes un nuevo mensaje de ${senderUsername}`,
    { messageId, senderUsername }
  );
}

/**
 * Helper: Notificar verificación aprobada
 */
export async function notifyVerificationApproved(userId: string): Promise<void> {
  await createNotification(
    userId,
    'verification_approved',
    '¡Verificación aprobada!',
    'Tu cuenta ha sido verificada exitosamente',
    {}
  );
}

/**
 * Helper: Notificar verificación rechazada
 */
export async function notifyVerificationRejected(
  userId: string,
  reason?: string
): Promise<void> {
  await createNotification(
    userId,
    'verification_rejected',
    'Verificación rechazada',
    reason || 'Tu solicitud de verificación no fue aprobada',
    { reason }
  );
}

/**
 * Helper: Notificar suspensión
 */
export async function notifySuspension(
  userId: string,
  reason: string,
  expiresAt?: string
): Promise<void> {
  const message = expiresAt
    ? `Tu cuenta ha sido suspendida hasta ${new Date(expiresAt).toLocaleDateString()}`
    : 'Tu cuenta ha sido suspendida permanentemente';

  await createNotification(
    userId,
    'suspension',
    'Cuenta suspendida',
    message,
    { reason, expiresAt }
  );
}

/**
 * Helper: Notificar advertencia
 */
export async function notifyWarning(
  userId: string,
  reason: string,
  warningCount: number
): Promise<void> {
  await createNotification(
    userId,
    'warning',
    'Advertencia de moderación',
    `Has recibido una advertencia (${warningCount} en total): ${reason}`,
    { reason, warningCount }
  );
}

/**
 * Helper: Notificación del sistema
 */
export async function notifySystem(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await createNotification(userId, 'system', title, message, data);
}

/**
 * Enviar notificación masiva (solo admins)
 */
export async function sendBulkNotification(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<{ success: number; failed: number }> {
  if (userIds.length === 0) return { success: 0, failed: 0 };

  try {
    // Batch insert using supabaseAdmin to bypass RLS
    const rows = userIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      message,
      data: data || null,
      is_read: false,
    }));

    const BATCH_SIZE = 500;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert(batch);

      if (error) {
        console.error('Bulk notification batch error:', error);
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Unexpected error in sendBulkNotification:', error);
    return { success: 0, failed: userIds.length };
  }
}
