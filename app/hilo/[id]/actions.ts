'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { sanitizeHtml } from '@/lib/sanitize';

export async function createReply(formData: {
  threadId: string;
  authorId: string;
  content: string;
}) {
  const supabase = createServerSupabaseClient();

  try {
    // Verify authenticated user matches provided authorId
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }
    if (user.id !== formData.authorId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is suspended
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single();
    if (userProfile?.is_suspended) {
      return { success: false, error: 'Account suspended' };
    }

    // Check thread is not locked
    const { data: threadCheck } = await supabase
      .from('threads')
      .select('is_locked')
      .eq('id', formData.threadId)
      .single();
    if (threadCheck?.is_locked) {
      return { success: false, error: 'Thread is locked' };
    }

    // Sanitize content
    const sanitizedContent = sanitizeHtml(formData.content);

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        thread_id: formData.threadId,
        author_id: user.id,
        content: sanitizedContent,
        is_first_post: false,
      })
      .select()
      .single();

    if (postError) {
      return { success: false, error: postError.message };
    }

    const { data: thread } = await supabase
      .from('threads')
      .select('replies_count, forum_id')
      .eq('id', formData.threadId)
      .single();

    if (thread) {
      await supabase
        .from('threads')
        .update({
          replies_count: thread.replies_count + 1,
          last_post_id: post.id,
          last_post_at: new Date().toISOString(),
        })
        .eq('id', formData.threadId);

      const { data: forum } = await supabase
        .from('forums')
        .select('posts_count')
        .eq('id', thread.forum_id)
        .single();

      if (forum) {
        await supabase
          .from('forums')
          .update({ posts_count: forum.posts_count + 1 })
          .eq('id', thread.forum_id);
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('posts_count')
      .eq('id', formData.authorId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ posts_count: profile.posts_count + 1 })
        .eq('id', formData.authorId);
    }

    revalidatePath(`/hilo/${formData.threadId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
