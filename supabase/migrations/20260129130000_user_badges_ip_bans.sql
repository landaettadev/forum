-- =============================================
-- User Badges, IP Bans and Enhanced Moderation
-- =============================================

-- IP Bans table
CREATE TABLE IF NOT EXISTS ip_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_bans_ip ON ip_bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_bans_active ON ip_bans(is_active) WHERE is_active = TRUE;

-- Add new action types to moderation_logs
ALTER TABLE moderation_logs DROP CONSTRAINT IF EXISTS moderation_logs_action_check;
ALTER TABLE moderation_logs ADD CONSTRAINT moderation_logs_action_check CHECK (action IN (
  'warn', 'delete_post', 'delete_thread', 'edit_post', 'edit_thread',
  'lock_thread', 'unlock_thread', 'pin_thread', 'unpin_thread',
  'ban', 'unban', 'suspend', 'unsuspend', 
  'ip_ban', 'ip_unban',
  'verify', 'unverify',
  'promote', 'demote', 'delete_user',
  'move_thread', 'merge_threads', 'split_thread'
));

-- Add columns to profiles for activity tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS threads_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_badge TEXT DEFAULT NULL;

-- Function to calculate user activity badge
CREATE OR REPLACE FUNCTION get_user_activity_badge(p_threads_count INTEGER, p_posts_count INTEGER)
RETURNS TEXT AS $$
DECLARE
  total_contributions INTEGER;
BEGIN
  total_contributions := COALESCE(p_threads_count, 0) + COALESCE(p_posts_count, 0);
  
  IF total_contributions >= 1000 THEN
    RETURN 'legend';
  ELSIF total_contributions >= 500 THEN
    RETURN 'veteran';
  ELSIF total_contributions >= 100 THEN
    RETURN 'active';
  ELSIF total_contributions >= 10 THEN
    RETURN 'newbie';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update user activity counts and badge
CREATE OR REPLACE FUNCTION update_user_activity_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'threads' THEN
      UPDATE profiles 
      SET threads_count = COALESCE(threads_count, 0) + 1,
          activity_badge = get_user_activity_badge(COALESCE(threads_count, 0) + 1, COALESCE(posts_count, 0))
      WHERE id = NEW.author_id;
    ELSIF TG_TABLE_NAME = 'posts' THEN
      UPDATE profiles 
      SET posts_count = COALESCE(posts_count, 0) + 1,
          activity_badge = get_user_activity_badge(COALESCE(threads_count, 0), COALESCE(posts_count, 0) + 1)
      WHERE id = NEW.author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'threads' THEN
      UPDATE profiles 
      SET threads_count = GREATEST(COALESCE(threads_count, 0) - 1, 0),
          activity_badge = get_user_activity_badge(GREATEST(COALESCE(threads_count, 0) - 1, 0), COALESCE(posts_count, 0))
      WHERE id = OLD.author_id;
    ELSIF TG_TABLE_NAME = 'posts' THEN
      UPDATE profiles 
      SET posts_count = GREATEST(COALESCE(posts_count, 0) - 1, 0),
          activity_badge = get_user_activity_badge(COALESCE(threads_count, 0), GREATEST(COALESCE(posts_count, 0) - 1, 0))
      WHERE id = OLD.author_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity tracking
DROP TRIGGER IF EXISTS trigger_thread_activity ON threads;
CREATE TRIGGER trigger_thread_activity
  AFTER INSERT OR DELETE ON threads
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity_counts();

DROP TRIGGER IF EXISTS trigger_post_activity ON posts;
CREATE TRIGGER trigger_post_activity
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity_counts();

-- Function to check if IP is banned
CREATE OR REPLACE FUNCTION is_ip_banned(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_bans
    WHERE ip_address = check_ip
      AND is_active = TRUE
      AND (is_permanent = TRUE OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions
    WHERE user_id = check_user_id
      AND is_active = TRUE
      AND (is_permanent = TRUE OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Update existing user counts (run once to sync)
UPDATE profiles p
SET 
  threads_count = (SELECT COUNT(*) FROM threads t WHERE t.author_id = p.id AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)),
  posts_count = (SELECT COUNT(*) FROM posts po WHERE po.author_id = p.id AND (po.is_deleted IS NULL OR po.is_deleted = FALSE));

-- Update activity badges for all users
UPDATE profiles
SET activity_badge = get_user_activity_badge(COALESCE(threads_count, 0), COALESCE(posts_count, 0));

-- RLS policies for ip_bans
ALTER TABLE ip_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all IP bans"
  ON ip_bans FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can insert IP bans"
  ON ip_bans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update IP bans"
  ON ip_bans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
