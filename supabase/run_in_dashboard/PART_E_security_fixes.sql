-- =============================================
-- PART E: Security fixes (run LAST)
-- =============================================

-- FIX 1: Enable RLS on escort_services (CRITICAL)
ALTER TABLE escort_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Servicios visibles para todos" ON escort_services;
CREATE POLICY "Servicios visibles para todos" ON escort_services
  FOR SELECT USING (true);

-- FIX 2: Recreate view with SECURITY INVOKER (CRITICAL)
DROP VIEW IF EXISTS user_thread_bookmarks_view;
CREATE VIEW user_thread_bookmarks_view WITH (security_invoker = true) AS
SELECT 
  tb.id,
  tb.user_id,
  tb.folder_name,
  tb.notes,
  tb.created_at as bookmarked_at,
  t.id as thread_id,
  t.title,
  t.created_at as thread_created_at,
  t.replies_count,
  t.views_count,
  t.is_pinned,
  t.is_locked,
  f.name as category_name,
  f.slug as category_slug,
  p.username as author_username,
  p.avatar_url as author_avatar
FROM thread_bookmarks tb
JOIN threads t ON tb.thread_id = t.id
JOIN forums f ON t.forum_id = f.id
JOIN profiles p ON t.author_id = p.id;
