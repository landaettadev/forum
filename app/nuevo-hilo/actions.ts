'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { sanitizeHtml } from '@/lib/sanitize';

export async function createThread(formData: {
  forumId?: string;
  title: string;
  content: string;
  authorId: string;
  tag?: 'review' | 'ask' | 'general';
  regionId?: string;
}) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify the user is authenticated and matches the provided authorId
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }
    if (user.id !== formData.authorId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is suspended
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single();
    if (profile?.is_suspended) {
      return { success: false, error: 'Account suspended' };
    }

    // Sanitize content
    const sanitizedContent = sanitizeHtml(formData.content);
    const sanitizedTitle = formData.title.trim();

    let forumId = formData.forumId;

    // Auto-find a forum if none was provided
    if (!forumId) {
      const { data: forums, error: forumsError } = await supabase
        .from('forums')
        .select('id')
        .order('display_order')
        .limit(1);
      forumId = forums?.[0]?.id;
    }

    // Create a default forum if none exists
    if (!forumId) {
      const { data: newForum, error: createForumError } = await supabase
        .from('forums')
        .insert({
          name: 'General',
          slug: 'general',
          description: 'General discussion forum',
          display_order: 0,
        })
        .select('id')
        .single();
      forumId = newForum?.id;
    }

    if (!forumId) {
      return { success: false, error: 'Could not create forum' };
    }

    const threadInsert: any = {
      forum_id: forumId,
      author_id: user.id,
      title: sanitizedTitle,
      tag: formData.tag || 'general',
      last_post_at: new Date().toISOString(),
    };
    if (formData.regionId) {
      threadInsert.region_id = formData.regionId;
    }

    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert(threadInsert)
      .select()
      .single();

    if (threadError) {
      return { success: false, error: threadError.message };
    }

    const { error: postError } = await supabase
      .from('posts')
      .insert({
        thread_id: thread.id,
        author_id: user.id,
        content: sanitizedContent,
        is_first_post: true,
      });

    if (postError) {
      await supabase.from('threads').delete().eq('id', thread.id);
      return { success: false, error: postError.message };
    }

    const { data: forum } = await supabase
      .from('forums')
      .select('threads_count, posts_count')
      .eq('id', forumId)
      .single();

    if (forum) {
      await supabase
        .from('forums')
        .update({
          threads_count: forum.threads_count + 1,
          posts_count: forum.posts_count + 1,
        })
        .eq('id', forumId);
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('posts_count')
      .eq('id', user.id)
      .single();

    if (userProfile) {
      await supabase
        .from('profiles')
        .update({ posts_count: userProfile.posts_count + 1 })
        .eq('id', user.id);
    }

    revalidatePath(`/foro`);
    revalidatePath(`/`);

    return { success: true, threadId: thread.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
