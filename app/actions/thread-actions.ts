'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateData, createThreadSchema, createPostSchema } from '@/lib/validation';
import { detectSpam, validateLinkCount } from '@/lib/sanitize';
import { extractMentions } from '@/lib/mentions';
import { getTranslations } from 'next-intl/server';

type ActionResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Crear un nuevo hilo en un foro
 */
export async function createThread(formData: FormData): Promise<ActionResult<{ threadId: string }>> {
  try {
    // Extraer datos del formulario
    const data = {
      forumId: formData.get('forumId') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      isNsfw: formData.get('isNsfw') === 'true',
    };

    // Validar datos
    const validation = validateData(createThreadSchema, data);
    if (!validation.success) {
      return {
        success: false,
        error: 'Datos inválidos',
        fieldErrors: Object.fromEntries(
          Object.entries(validation.errors).map(([key, messages]) => [key, messages[0]])
        ),
      };
    }

    const { forumId, title, content } = validation.data;
    const supabase = createServerSupabaseClient();
    const t = await getTranslations('serverErrors');

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: t('loginRequiredThread') };
    }

    // Verificar que el usuario no esté suspendido
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended, suspended_until, is_verified')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
      const suspendedUntil = profile.suspended_until 
        ? new Date(profile.suspended_until).toLocaleDateString()
        : t('indefinitely');
      return { 
        success: false, 
        error: `${t('accountSuspendedUntil')} ${suspendedUntil}` 
      };
    }

    // Validaciones de spam
    if (detectSpam(content)) {
      return { success: false, error: t('spamDetected') };
    }

    if (!validateLinkCount(content, 5)) {
      return { success: false, error: t('tooManyLinks5') };
    }

    // Verificar que el foro existe
    const { data: forum, error: forumError } = await supabase
      .from('forums')
      .select('id, is_private')
      .eq('id', forumId)
      .single();

    if (forumError || !forum) {
      return { success: false, error: t('forumNotFound') };
    }

    // Si el foro es privado, verificar que el usuario esté verificado
    if (forum.is_private && !profile?.is_verified) {
      return { 
        success: false, 
        error: t('forumRequiresVerification') 
      };
    }

    // Crear el hilo
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        forum_id: forumId,
        author_id: user.id,
        title: title,
        is_hot: false,
      })
      .select('id')
      .single();

    if (threadError || !thread) {
      console.error('Error creating thread:', threadError);
      return { success: false, error: t('errorCreatingThread') };
    }

    // Crear el primer post del hilo
    const { error: postError } = await supabase
      .from('posts')
      .insert({
        thread_id: thread.id,
        author_id: user.id,
        content: content,
        is_first_post: true,
      });

    if (postError) {
      // Rollback: eliminar el hilo si falla crear el post
      await supabase.from('threads').delete().eq('id', thread.id);
      console.error('Error creating first post:', postError);
      return { success: false, error: t('errorCreatingThreadContent') };
    }

    // Revalidar la página del foro
    revalidatePath(`/foro/${forumId}`);
    revalidatePath('/');

    return { 
      success: true, 
      data: { threadId: thread.id } 
    };

  } catch (error) {
    console.error('Unexpected error in createThread:', error);
    const tErr = await getTranslations('serverErrors');
    return { success: false, error: tErr('unexpectedErrorThread') };
  }
}

/**
 * Crear una respuesta en un hilo
 */
export async function createPost(formData: FormData): Promise<ActionResult<{ postId: string }>> {
  try {
    const data = {
      threadId: formData.get('threadId') as string,
      content: formData.get('content') as string,
      quotedPostId: formData.get('quotedPostId') as string | undefined,
    };

    const validation = validateData(createPostSchema, data);
    if (!validation.success) {
      return {
        success: false,
        error: 'Datos inválidos',
        fieldErrors: Object.fromEntries(
          Object.entries(validation.errors).map(([key, messages]) => [key, messages[0]])
        ),
      };
    }

    const { threadId, content } = validation.data;
    const supabase = createServerSupabaseClient();
    const t = await getTranslations('serverErrors');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: t('loginRequiredReply') };
    }

    // Verificar que el usuario no esté suspendido
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
      return { success: false, error: t('accountSuspended') };
    }

    // Validaciones anti-spam
    if (detectSpam(content)) {
      return { success: false, error: t('spamDetected') };
    }

    if (!validateLinkCount(content, 3)) {
      return { success: false, error: t('tooManyLinks3') };
    }

    // Verificar que el hilo existe y no está bloqueado
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id, is_locked, forum_id, author_id, title')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      return { success: false, error: t('threadNotFound') };
    }

    if (thread.is_locked) {
      return { success: false, error: t('threadLocked') };
    }

    // Crear el post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        thread_id: threadId,
        author_id: user.id,
        content: content,
        is_first_post: false,
      })
      .select('id')
      .single();

    if (postError || !post) {
      console.error('Error creating post:', postError);
      return { success: false, error: t('errorCreatingReply') };
    }

    // Actualizar contador de respuestas y último post
    const { data: currentThread } = await supabase
      .from('threads')
      .select('replies_count')
      .eq('id', threadId)
      .single();
    await supabase
      .from('threads')
      .update({
        replies_count: (currentThread?.replies_count || 0) + 1,
        last_post_id: post.id,
        last_post_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    // Actualizar contador de posts del usuario
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('posts_count')
      .eq('id', user.id)
      .single();
    if (userProfile) {
      await supabase
        .from('profiles')
        .update({ posts_count: (userProfile.posts_count || 0) + 1 })
        .eq('id', user.id);
    }

    // Notificar al autor del hilo (si no es el mismo usuario)
    if (thread.author_id && thread.author_id !== user.id) {
      const { notifyThreadReply } = await import('@/lib/notifications');
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        await notifyThreadReply(
          thread.author_id,
          profile.username,
          thread.title,
          threadId,
          supabase
        );
      }
    }

    // Notificar menciones
    const mentions = extractMentions(content);
    if (mentions.length > 0) {
      const { notifyMention } = await import('@/lib/notifications');
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentions);

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (mentionedUsers && senderProfile) {
        for (const mentioned of mentionedUsers) {
          if (mentioned.id !== user.id) {
            await notifyMention(
              mentioned.id,
              senderProfile.username,
              post.id,
              threadId,
              supabase
            );
          }
        }
      }
    }

    // Revalidar página del hilo
    revalidatePath(`/hilo/${threadId}`);

    return { 
      success: true, 
      data: { postId: post.id } 
    };

  } catch (error) {
    console.error('Unexpected error in createPost:', error);
    const tErr = await getTranslations('serverErrors');
    return { success: false, error: tErr('unexpectedErrorReply') };
  }
}

/**
 * Dar "gracias" a un post
 */
export async function thankPost(postId: string): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Login required' };
    }

    const t = await getTranslations('serverErrors');

    // Verificar que el post existe
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return { success: false, error: t('postNotFound') };
    }

    // No puedes dar gracias a tu propio post
    if (post.author_id === user.id) {
      return { success: false, error: t('cantThankOwnPost') };
    }

    // Intentar agregar el "gracias"
    const { error: thanksError } = await supabase
      .from('post_thanks')
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    if (thanksError) {
      // Si ya existe, eliminarlo (toggle)
      if (thanksError.code === '23505') { // Duplicate key
        const { error: deleteError } = await supabase
          .from('post_thanks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) {
          return { success: false, error: t('errorRemovingThanks') };
        }

        // Decrementar contador
        const { data: currentPost } = await supabase
          .from('posts')
          .select('thanks_count')
          .eq('id', postId)
          .single();
        if (currentPost) {
          await supabase
            .from('posts')
            .update({ thanks_count: Math.max(0, (currentPost.thanks_count || 0) - 1) })
            .eq('id', postId);
        }

        return { success: true, data: { action: 'removed' } };
      }

      return { success: false, error: t('errorAddingThanks') };
    }

    // Incrementar contador de gracias
    const { data: currentPost2 } = await supabase
      .from('posts')
      .select('thanks_count')
      .eq('id', postId)
      .single();
    if (currentPost2) {
      await supabase
        .from('posts')
        .update({ thanks_count: (currentPost2.thanks_count || 0) + 1 })
        .eq('id', postId);
    }

    // Incrementar contador en el perfil del autor
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('thanks_received')
      .eq('id', post.author_id)
      .single();
    if (authorProfile) {
      await supabase
        .from('profiles')
        .update({ thanks_received: (authorProfile.thanks_received || 0) + 1 })
        .eq('id', post.author_id);
    }

    return { success: true, data: { action: 'added' } };

  } catch (error) {
    console.error('Unexpected error in thankPost:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Editar un post
 */
export async function editPost(postId: string, content: string): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Login required' };
    }

    // Validar contenido
    if (!content || content.length < 1) {
      const t = await getTranslations('serverErrors');
      return { success: false, error: t('contentEmpty') };
    }

    if (content.length > 50000) {
      const t = await getTranslations('serverErrors');
      return { success: false, error: t('contentTooLong') };
    }

    // Verificar que el post existe y pertenece al usuario
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, thread_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      const t = await getTranslations('serverErrors');
      return { success: false, error: t('postNotFound') };
    }

    // Verificar permisos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isModerator = profile?.role === 'mod' || profile?.role === 'admin';
    const isAuthor = post.author_id === user.id;

    if (!isAuthor && !isModerator) {
      const t = await getTranslations('serverErrors');
      return { success: false, error: t('noEditPermission') };
    }

    // Actualizar el post
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        content: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      return { success: false, error: 'Error updating post' };
    }

    // Revalidar página del hilo
    revalidatePath(`/hilo/${post.thread_id}`);

    return { success: true, data: null };

  } catch (error) {
    console.error('Unexpected error in editPost:', error);
    return { success: false, error: 'Unexpected error' };
  }
}
