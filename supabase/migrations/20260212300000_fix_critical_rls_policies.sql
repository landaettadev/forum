-- =============================================
-- CRITICAL SECURITY FIX: Restrict overly permissive INSERT policies
-- =============================================
-- Issue 1: notifications INSERT allowed any authenticated user to create
--          notifications for ANY other user (spam vector).
--          Fix: restrict to own user_id only. Server-side cross-user
--          notifications use the service_role key which bypasses RLS.
-- Issue 2: user_ips INSERT allowed any authenticated user to insert
--          arbitrary IP records (log poisoning vector).
--          Fix: restrict to own user_id + moderators/admins.
-- =============================================

-- 1. FIX NOTIFICATIONS INSERT POLICY
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. FIX USER_IPS INSERT POLICY
DROP POLICY IF EXISTS "System can log IPs" ON user_ips;

CREATE POLICY "Users can log own IPs"
  ON user_ips FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('mod', 'admin')
    )
  );

-- =============================================
-- VERIFICATION
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'SECURITY FIX: notifications INSERT restricted to auth.uid() = user_id';
  RAISE NOTICE 'SECURITY FIX: user_ips INSERT restricted to own user_id + mods/admins';
  RAISE NOTICE 'NOTE: Cross-user notifications must use supabaseAdmin (service_role) which bypasses RLS';
END $$;
