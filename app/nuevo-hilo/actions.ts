'use server';

import { createThread as _createThread } from '@/app/actions/thread-actions';

/**
 * Thin wrapper that adapts the legacy nuevo-hilo call signature to the
 * unified createThread in thread-actions.ts.
 * `authorId` is intentionally ignored — the server action always uses
 * the authenticated user from the session.
 */
export async function createThread(formData: {
  forumId?: string;
  title: string;
  content: string;
  authorId?: string;
  tag?: 'review' | 'ask' | 'general';
  regionId?: string;
}) {
  const result = await _createThread({
    forumId: formData.forumId,
    title: formData.title,
    content: formData.content,
    tag: formData.tag,
    regionId: formData.regionId,
  });

  // Adapt response shape: legacy callers expect { success, threadId, error }
  if (result.success) {
    return { success: true as const, threadId: result.data.threadId };
  }
  return { success: false as const, error: result.error };
}
