'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateData, createThreadSchema, createPostSchema, editPostSchema, thankPostSchema } from '@/lib/validation';
import { detectSpam, validateLinkCount } from '@/lib/sanitize';
import { extractMentions } from '@/lib/mentions';
import { incrementCounter } from '@/lib/increment-counter';
import { getTranslations } from 'next-intl/server';
import { generateSlug } from '@/lib/slug';

type ActionResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Crear un nuevo hilo en un foro.
 * Accepts both FormData (from CreateThreadForm component) and plain object
 * (from nuevo-hilo page). This is the single source of truth for thread creation.
 */
export async function createThread(
  input: FormData | { forumId?: string; title: string; content: string; tag?: string; regionId?: string }
): Promise<ActionResult<{ threadId: string }>> {
  try {
    // Normalise input — accept FormData or plain object
    const raw = input instanceof FormData
      ? {
          forumId: input.get('forumId') as string,
          title: input.get('title') as string,
          content: input.get('content') as string,
          isNsfw: input.get('isNsfw') === 'true',
          tag: (input.get('tag') as string) || undefined,
          regionId: (input.get('regionId') as string) || undefined,
        }
      : {
          forumId: input.forumId || '',
          title: input.title,
          content: input.content,
          isNsfw: false,
          tag: input.tag || undefined,
          regionId: input.regionId || undefined,
        };

    // Validar datos con Zod
    const validation = validateData(createThreadSchema, {
      forumId: raw.forumId,
      title: raw.title,
      content: raw.content,
      isNsfw: raw.isNsfw,
    });

    // If forumId is empty we skip Zod UUID check and resolve it below
    if (!raw.forumId) {
      // Only validate title + content
      const tEarly = await getTranslations('serverErrors');
      if (raw.title.trim().length < 5) {
        return { success: false, error: tEarly('titleTooShort') };
      }
      if (raw.content.trim().length < 10) {
        return { success: false, error: tEarly('contentTooShort') };
      }
    } else if (!validation.success) {
      return {
        success: false,
        error: (await getTranslations('serverErrors'))('invalidData'),
        fieldErrors: Object.fromEntries(
          Object.entries(validation.errors).map(([key, messages]) => [key, messages[0]])
        ),
      };
    }

    const supabase = createServerSupabaseClient();
    const t = await getTranslations('serverErrors');

    // Obtener usuario actual — always use server-side auth, never trust client
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: t('loginRequiredThread') };
    }

    // Verificar que el usuario no esté suspendido
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended, suspended_until, is_verified, is_escort, role')
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

    // Rate limit: 5 minutes between threads (exempt mods/admins)
    if (profile?.role !== 'admin' && profile?.role !== 'mod') {
      const { data: lastThread } = await supabase
        .from('threads')
        .select('created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastThread) {
        const elapsed = Date.now() - new Date(lastThread.created_at).getTime();
        const cooldown = 5 * 60 * 1000; // 5 minutes
        if (elapsed < cooldown) {
          const remaining = Math.ceil((cooldown - elapsed) / 1000);
          return {
            success: false,
            error: t('threadCooldown', { seconds: remaining }),
          };
        }
      }
    }

    // Sanitize content (Zod schema already does sanitizeHtml, but handle non-Zod path)
    const title = validation.success ? validation.data.title : raw.title.trim();
    const content = validation.success ? validation.data.content : (await import('@/lib/sanitize')).sanitizeHtml(raw.content);

    // Validaciones de spam
    if (detectSpam(content)) {
      return { success: false, error: t('spamDetected') };
    }

    if (!validateLinkCount(content, 5)) {
      return { success: false, error: t('tooManyLinks5') };
    }

    // Resolve forumId — if empty, pick first available forum
    let forumId = validation.success ? validation.data.forumId : raw.forumId;
    if (!forumId) {
      const { data: forums } = await supabase
        .from('forums')
        .select('id')
        .order('display_order')
        .limit(1);
      forumId = forums?.[0]?.id;
    }

    if (!forumId) {
      return { success: false, error: t('forumNotFound') };
    }

    // Verificar que el foro existe
    const { data: forum, error: forumError } = await supabase
      .from('forums')
      .select('id, is_private, is_escort_only')
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

    // Si el foro es de autopromoción (escort-only), solo escorts verificadas, admin y mod pueden crear hilos
    if (forum.is_escort_only) {
      const isEscort = profile?.is_escort === true;
      const isStaff = profile?.role === 'admin' || profile?.role === 'mod';
      if (!isEscort && !isStaff) {
        return {
          success: false,
          error: t('escortOnlyForum'),
        };
      }
    }

    // Generate SEO slug from title - only add suffix if needed for uniqueness
    const baseSlug = generateSlug(title);
    let threadSlug = baseSlug;
    
    // Check if slug already exists and add numeric suffix if needed
    const { data: existingThread } = await supabase
      .from('threads')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle();
    
    if (existingThread) {
      // Find next available number
      const { count } = await supabase
        .from('threads')
        .select('id', { count: 'exact', head: true })
        .like('slug', `${baseSlug}-%`);
      threadSlug = `${baseSlug}-${(count || 0) + 2}`;
    }

    // Crear el hilo
    const threadInsert: Record<string, unknown> = {
      forum_id: forumId,
      author_id: user.id,
      title,
      slug: threadSlug,
      is_hot: false,
      last_post_at: new Date().toISOString(),
    };
    if (raw.tag) threadInsert.tag = raw.tag;
    if (raw.regionId) threadInsert.region_id = raw.regionId;

    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert(threadInsert)
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
        content,
        is_first_post: true,
      });

    if (postError) {
      // Rollback: eliminar el hilo si falla crear el post
      await supabase.from('threads').delete().eq('id', thread.id);
      console.error('Error creating first post:', postError);
      return { success: false, error: t('errorCreatingThreadContent') };
    }

    // Atomic counter increments via centralised helper
    await incrementCounter(supabase, 'forums', 'threads_count', forumId);
    await incrementCounter(supabase, 'forums', 'posts_count', forumId);
    await incrementCounter(supabase, 'profiles', 'posts_count', user.id);

    // Revalidar la página del foro
    revalidatePath(`/foro/${forumId}`);
    revalidatePath(`/foro`);
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
    const t = await getTranslations('serverErrors');
    if (!validation.success) {
      return {
        success: false,
        error: t('invalidData'),
        fieldErrors: Object.fromEntries(
          Object.entries(validation.errors).map(([key, messages]) => [key, messages[0]])
        ),
      };
    }

    const { threadId, content } = validation.data;
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: t('loginRequiredReply') };
    }

    // Verificar que el usuario no esté suspendido
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended, role')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
      return { success: false, error: t('accountSuspended') };
    }

    // Rate limit: 25 seconds between posts (exempt mods/admins)
    if (profile?.role !== 'admin' && profile?.role !== 'mod') {
      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPost) {
        const elapsed = Date.now() - new Date(lastPost.created_at).getTime();
        const cooldown = 25 * 1000; // 25 seconds
        if (elapsed < cooldown) {
          const remaining = Math.ceil((cooldown - elapsed) / 1000);
          return {
            success: false,
            error: t('postCooldown', { seconds: remaining }),
          };
        }
      }
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

    // Update last_post metadata (non-counter fields)
    await supabase
      .from('threads')
      .update({
        last_post_id: post.id,
        last_post_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    // Atomic counter increments via centralised helper
    await incrementCounter(supabase, 'threads', 'replies_count', threadId);
    await incrementCounter(supabase, 'profiles', 'posts_count', user.id);

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
    // Validate input with Zod
    const validation = validateData(thankPostSchema, { postId });
    const t = await getTranslations('serverErrors');
    if (!validation.success) {
      return { success: false, error: t('invalidPostId') };
    }

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: t('loginRequired') };
    }

    // Verificar que el post existe
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', validation.data.postId)
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

        // Atomic decrement for thanks_count
        await incrementCounter(supabase, 'posts', 'thanks_count', postId, -1);

        return { success: true, data: { action: 'removed' } };
      }

      return { success: false, error: t('errorAddingThanks') };
    }

    // Atomic increment for thanks_count + author thanks_received
    await incrementCounter(supabase, 'posts', 'thanks_count', postId);
    await incrementCounter(supabase, 'profiles', 'thanks_received', post.author_id);

    return { success: true, data: { action: 'added' } };

  } catch (error) {
    console.error('Unexpected error in thankPost:', error);
    const tErr = await getTranslations('serverErrors');
    return { success: false, error: tErr('unexpectedError') };
  }
}

/**
 * Editar un hilo (título, tag, contenido del primer post) — admin/mod/author
 */
export async function editThread(
  threadId: string,
  data: { title?: string; tag?: string; content?: string; isNsfw?: boolean }
): Promise<ActionResult> {
  try {
    const t = await getTranslations('serverErrors');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: t('loginRequired') };
    }

    // Fetch thread
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id, author_id, forum_id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      return { success: false, error: t('threadNotFound') };
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isModerator = profile?.role === 'mod' || profile?.role === 'admin';
    const isAuthor = thread.author_id === user.id;

    if (!isAuthor && !isModerator) {
      return { success: false, error: t('noEditPermission') };
    }

    // Update thread metadata (title, tag)
    const threadUpdate: Record<string, unknown> = {};
    if (data.title && data.title.trim().length >= 5) {
      threadUpdate.title = data.title.trim();
      const newBaseSlug = generateSlug(data.title.trim());
      
      // Check if new slug already exists (excluding current thread)
      const { data: existingThread } = await supabase
        .from('threads')
        .select('id')
        .eq('slug', newBaseSlug)
        .neq('id', threadId)
        .maybeSingle();
      
      if (existingThread) {
        const { count } = await supabase
          .from('threads')
          .select('id', { count: 'exact', head: true })
          .like('slug', `${newBaseSlug}-%`);
        threadUpdate.slug = `${newBaseSlug}-${(count || 0) + 2}`;
      } else {
        threadUpdate.slug = newBaseSlug;
      }
    }
    if (data.tag) {
      threadUpdate.tag = data.tag;
    }
    if (typeof data.isNsfw === 'boolean') {
      threadUpdate.is_nsfw = data.isNsfw;
    }

    if (Object.keys(threadUpdate).length > 0) {
      const { error: updateErr } = await supabase
        .from('threads')
        .update(threadUpdate)
        .eq('id', threadId);

      if (updateErr) {
        console.error('Error updating thread:', updateErr);
        return { success: false, error: t('errorUpdatingThread') };
      }
    }

    // Update first post content if provided
    if (data.content && data.content.trim().length >= 10) {
      const { sanitizeHtml } = await import('@/lib/sanitize');
      const sanitized = sanitizeHtml(data.content);

      const { error: postErr } = await supabase
        .from('posts')
        .update({
          content: sanitized,
          updated_at: new Date().toISOString(),
        })
        .eq('thread_id', threadId)
        .eq('is_first_post', true);

      if (postErr) {
        console.error('Error updating first post:', postErr);
        return { success: false, error: t('errorUpdatingPost') };
      }
    }

    revalidatePath(`/hilo/${threadId}`);
    return { success: true, data: null };

  } catch (error) {
    console.error('Unexpected error in editThread:', error);
    const tErr = await getTranslations('serverErrors');
    return { success: false, error: tErr('unexpectedError') };
  }
}

/**
 * Editar un post
 */
export async function editPost(postId: string, content: string): Promise<ActionResult> {
  try {
    // Validate and sanitize input with Zod
    const validation = validateData(editPostSchema, { postId, content });
    const t = await getTranslations('serverErrors');
    if (!validation.success) {
      return {
        success: false,
        error: t('invalidData'),
        fieldErrors: Object.fromEntries(
          Object.entries(validation.errors).map(([key, messages]) => [key, messages[0]])
        ),
      };
    }

    const { postId: validPostId, content: sanitizedContent } = validation.data;
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: t('loginRequired') };
    }

    // Verificar que el post existe y pertenece al usuario
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, thread_id')
      .eq('id', validPostId)
      .single();

    if (postError || !post) {
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
      return { success: false, error: t('noEditPermission') };
    }

    // Actualizar el post with sanitized content from Zod
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        content: sanitizedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validPostId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      return { success: false, error: t('errorUpdatingPost') };
    }

    // Revalidar página del hilo
    revalidatePath(`/hilo/${post.thread_id}`);

    return { success: true, data: null };

  } catch (error) {
    console.error('Unexpected error in editPost:', error);
    const tErr = await getTranslations('serverErrors');
    return { success: false, error: tErr('unexpectedError') };
  }
}

/**
 * Eliminar un post — admin/mod o autor del post
 * Si es el primer post del hilo, elimina todo el hilo.
 */
export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    const t = await getTranslations('serverErrors');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: t('loginRequired') };
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, thread_id, is_first_post')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return { success: false, error: t('postNotFound') };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isModerator = profile?.role === 'mod' || profile?.role === 'admin';
    const isAuthor = post.author_id === user.id;

    if (!isAuthor && !isModerator) {
      return { success: false, error: t('noDeletePermission') };
    }

    if (post.is_first_post) {
      // Deleting the first post = delete the entire thread
      const { error: delErr } = await supabase
        .from('threads')
        .delete()
        .eq('id', post.thread_id);

      if (delErr) {
        console.error('Error deleting thread:', delErr);
        return { success: false, error: t('errorDeletingThread') };
      }

      revalidatePath('/');
      return { success: true, data: { deletedThread: true, threadId: post.thread_id } };
    } else {
      // Delete just the post
      const { error: delErr } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (delErr) {
        console.error('Error deleting post:', delErr);
        return { success: false, error: t('errorDeletingPost') };
      }

      revalidatePath(`/hilo/${post.thread_id}`);
      return { success: true, data: { deletedThread: false } };
    }

  } catch (error) {
    console.error('Unexpected error in deletePost:', error);
    const tErr = await getTranslations('serverErrors');
    return { success: false, error: tErr('unexpectedError') };
  }
}
