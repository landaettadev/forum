-- =============================================
-- FILE: 20260129290000_report_system.sql
-- =============================================
-- Report system for posts, threads, and users

-- Report status enum
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- Report reason enum
CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'inappropriate',
  'off_topic',
  'duplicate',
  'misinformation',
  'illegal',
  'other'
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason report_reason NOT NULL,
  description text,
  status report_status DEFAULT 'pending',
  -- Target can be post, thread, or user
  target_type text NOT NULL CHECK (target_type IN ('post', 'thread', 'user', 'message')),
  target_id uuid NOT NULL,
  -- Moderation
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes text,
  action_taken text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" 
  ON reports FOR SELECT 
  USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports" 
  ON reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

-- Moderators can view all reports (requires role check in app)
CREATE POLICY "Moderators can view all reports" 
  ON reports FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'moderator')
    )
  );

-- Moderators can update reports
CREATE POLICY "Moderators can update reports" 
  ON reports FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'moderator')
    )
  );

-- Function to create a report
CREATE OR REPLACE FUNCTION create_report(
  p_target_type text,
  p_target_id uuid,
  p_reason report_reason,
  p_description text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_reporter_id uuid;
  v_existing uuid;
  v_report_id uuid;
BEGIN
  v_reporter_id := auth.uid();
  
  IF v_reporter_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check for existing report from same user on same target
  SELECT id INTO v_existing 
  FROM reports 
  WHERE reporter_id = v_reporter_id 
    AND target_type = p_target_type 
    AND target_id = p_target_id
    AND status IN ('pending', 'reviewing');

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already reported');
  END IF;

  INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
  VALUES (v_reporter_id, p_target_type, p_target_id, p_reason, p_description)
  RETURNING id INTO v_report_id;

  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reports count (for moderators)
CREATE OR REPLACE FUNCTION get_pending_reports_count()
RETURNS bigint AS $$
  SELECT COUNT(*) FROM reports WHERE status = 'pending';
$$ LANGUAGE sql SECURITY DEFINER;

-- Function for moderators to update report status
CREATE OR REPLACE FUNCTION update_report_status(
  p_report_id uuid,
  p_status report_status,
  p_notes text DEFAULT NULL,
  p_action text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_moderator_id uuid;
BEGIN
  v_moderator_id := auth.uid();
  
  -- Check if user is moderator
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_moderator_id 
    AND (role = 'admin' OR role = 'moderator')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE reports SET
    status = p_status,
    moderator_id = v_moderator_id,
    moderator_notes = COALESCE(p_notes, moderator_notes),
    action_taken = p_action,
    resolved_at = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_report_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reports for moderation
CREATE OR REPLACE FUNCTION get_reports_for_moderation(
  p_status report_status DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  reporter_username text,
  reason report_reason,
  description text,
  status report_status,
  target_type text,
  target_id uuid,
  created_at timestamptz,
  moderator_username text
) AS $$
BEGIN
  -- Check if user is moderator
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (role = 'admin' OR role = 'moderator')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.reporter_id,
    p.username as reporter_username,
    r.reason,
    r.description,
    r.status,
    r.target_type,
    r.target_id,
    r.created_at,
    m.username as moderator_username
  FROM reports r
  LEFT JOIN profiles p ON r.reporter_id = p.id
  LEFT JOIN profiles m ON r.moderator_id = m.id
  WHERE (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- FILE: 20260129300000_profile_improvements.sql
-- =============================================
-- User profile improvements

-- Add extended profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;

-- User follows system
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON user_follows(following_id);

-- RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" 
  ON user_follows FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" 
  ON user_follows FOR ALL 
  USING (auth.uid() = follower_id);

-- Function to toggle follow
CREATE OR REPLACE FUNCTION toggle_user_follow(p_following_id uuid)
RETURNS json AS $$
DECLARE
  v_follower_id uuid;
  v_existing uuid;
  v_is_following boolean;
BEGIN
  v_follower_id := auth.uid();
  
  IF v_follower_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_follower_id = p_following_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;

  SELECT id INTO v_existing 
  FROM user_follows 
  WHERE follower_id = v_follower_id AND following_id = p_following_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM user_follows WHERE id = v_existing;
    v_is_following := false;
  ELSE
    INSERT INTO user_follows (follower_id, following_id)
    VALUES (v_follower_id, p_following_id);
    v_is_following := true;
    
    -- Notify the user being followed
    PERFORM create_notification(
      p_following_id,
      'follow'::notification_type,
      (SELECT username FROM profiles WHERE id = v_follower_id) || ' te sigue',
      NULL,
      '/perfil/' || (SELECT username FROM profiles WHERE id = v_follower_id),
      v_follower_id,
      'user',
      v_follower_id
    );
  END IF;

  RETURN json_build_object('success', true, 'following', v_is_following);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if following
CREATE OR REPLACE FUNCTION is_following_user(p_following_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = auth.uid() AND following_id = p_following_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get followers count
CREATE OR REPLACE FUNCTION get_followers_count(p_user_id uuid)
RETURNS bigint AS $$
  SELECT COUNT(*) FROM user_follows WHERE following_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(p_user_id uuid)
RETURNS bigint AS $$
  SELECT COUNT(*) FROM user_follows WHERE follower_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get user's followers
CREATE OR REPLACE FUNCTION get_user_followers(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  bio text,
  followed_at timestamptz
) AS $$
  SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.bio,
    uf.created_at as followed_at
  FROM user_follows uf
  JOIN profiles p ON uf.follower_id = p.id
  WHERE uf.following_id = p_user_id
  ORDER BY uf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get user's following
CREATE OR REPLACE FUNCTION get_user_following(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  bio text,
  followed_at timestamptz
) AS $$
  SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.bio,
    uf.created_at as followed_at
  FROM user_follows uf
  JOIN profiles p ON uf.following_id = p.id
  WHERE uf.follower_id = p_user_id
  ORDER BY uf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to increment profile views
CREATE OR REPLACE FUNCTION increment_profile_views(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get extended profile stats
CREATE OR REPLACE FUNCTION get_profile_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'posts_count', (SELECT COUNT(*) FROM posts WHERE author_id = p_user_id),
    'threads_count', (SELECT COUNT(*) FROM threads WHERE author_id = p_user_id),
    'thanks_received', (SELECT COUNT(*) FROM post_thanks pt JOIN posts p ON pt.post_id = p.id WHERE p.author_id = p_user_id),
    'thanks_given', (SELECT COUNT(*) FROM post_thanks WHERE user_id = p_user_id),
    'followers_count', (SELECT COUNT(*) FROM user_follows WHERE following_id = p_user_id),
    'following_count', (SELECT COUNT(*) FROM user_follows WHERE follower_id = p_user_id),
    'profile_views', (SELECT COALESCE(profile_views, 0) FROM profiles WHERE id = p_user_id),
    'reputation', (SELECT COALESCE(reputation, 0) FROM profiles WHERE id = p_user_id),
    'reputation_level', (SELECT COALESCE(reputation_level, 'newbie') FROM profiles WHERE id = p_user_id)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- FILE: 20260129310000_user_blocking.sql
-- =============================================
-- User blocking system

-- Blocked users table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON user_blocks(blocked_id);

-- RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" 
  ON user_blocks FOR SELECT 
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage own blocks" 
  ON user_blocks FOR ALL 
  USING (auth.uid() = blocker_id);

-- Function to toggle block
CREATE OR REPLACE FUNCTION toggle_user_block(p_blocked_id uuid, p_reason text DEFAULT NULL)
RETURNS json AS $$
DECLARE
  v_blocker_id uuid;
  v_existing uuid;
  v_is_blocked boolean;
BEGIN
  v_blocker_id := auth.uid();
  
  IF v_blocker_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_blocker_id = p_blocked_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot block yourself');
  END IF;

  SELECT id INTO v_existing 
  FROM user_blocks 
  WHERE blocker_id = v_blocker_id AND blocked_id = p_blocked_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM user_blocks WHERE id = v_existing;
    v_is_blocked := false;
  ELSE
    INSERT INTO user_blocks (blocker_id, blocked_id, reason)
    VALUES (v_blocker_id, p_blocked_id, p_reason);
    v_is_blocked := true;
    
    -- Also unfollow if following
    DELETE FROM user_follows 
    WHERE (follower_id = v_blocker_id AND following_id = p_blocked_id)
       OR (follower_id = p_blocked_id AND following_id = v_blocker_id);
  END IF;

  RETURN json_build_object('success', true, 'blocked', v_is_blocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = auth.uid() AND blocked_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if blocked by user
CREATE OR REPLACE FUNCTION is_blocked_by_user(p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = p_user_id AND blocked_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get blocked users list
CREATE OR REPLACE FUNCTION get_blocked_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  blocked_at timestamptz,
  reason text
) AS $$
  SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    ub.created_at as blocked_at,
    ub.reason
  FROM user_blocks ub
  JOIN profiles p ON ub.blocked_id = p.id
  WHERE ub.blocker_id = auth.uid()
  ORDER BY ub.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- View to filter out blocked users from posts (for use in queries)
CREATE OR REPLACE FUNCTION filter_blocked_posts(p_posts anyarray)
RETURNS anyarray AS $$
  SELECT array_agg(p)
  FROM unnest(p_posts) p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = auth.uid() 
    AND blocked_id = (p).author_id
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- =============================================
-- FILE: 20260129320000_consolidated_features.sql
-- =============================================
-- Consolidated features migration (handles existing objects)
-- This migration adds all new forum features in an idempotent way

-- ============================================
-- ONLINE STATUS
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

CREATE OR REPLACE FUNCTION update_user_presence(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET last_seen_at = now(), is_online = true WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_online_users_count()
RETURNS bigint AS $$
  SELECT COUNT(*) FROM profiles WHERE is_online = true OR last_seen_at > now() - interval '5 minutes';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_online_users(p_limit integer DEFAULT 20)
RETURNS TABLE (user_id uuid, username text, avatar_url text, last_seen_at timestamptz, is_online boolean) AS $$
  SELECT id, username, avatar_url, last_seen_at,
    CASE WHEN is_online = true OR last_seen_at > now() - interval '5 minutes' THEN true ELSE false END
  FROM profiles WHERE last_seen_at > now() - interval '30 minutes'
  ORDER BY last_seen_at DESC LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- REPUTATION SYSTEM
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_level text DEFAULT 'newbie';

CREATE TABLE IF NOT EXISTS reputation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  source_type text,
  source_id uuid,
  given_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION get_reputation_level(rep integer)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN rep >= 5000 THEN 'legend'
    WHEN rep >= 2500 THEN 'master'
    WHEN rep >= 1000 THEN 'expert'
    WHEN rep >= 500 THEN 'trusted'
    WHEN rep >= 200 THEN 'active'
    WHEN rep >= 50 THEN 'member'
    ELSE 'newbie'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION add_reputation(p_user_id uuid, p_amount integer, p_reason text, p_source_type text DEFAULT NULL, p_source_id uuid DEFAULT NULL, p_given_by uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE v_new_rep integer; v_new_level text; v_old_level text;
BEGIN
  SELECT reputation_level INTO v_old_level FROM profiles WHERE id = p_user_id;
  UPDATE profiles SET reputation = GREATEST(0, reputation + p_amount) WHERE id = p_user_id RETURNING reputation INTO v_new_rep;
  v_new_level := get_reputation_level(v_new_rep);
  IF v_new_level != v_old_level THEN UPDATE profiles SET reputation_level = v_new_level WHERE id = p_user_id; END IF;
  INSERT INTO reputation_history (user_id, amount, reason, source_type, source_id, given_by) VALUES (p_user_id, p_amount, p_reason, p_source_type, p_source_id, p_given_by);
  RETURN json_build_object('success', true, 'new_reputation', v_new_rep, 'new_level', v_new_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_reputation_leaderboard(p_limit integer DEFAULT 10)
RETURNS TABLE (user_id uuid, username text, avatar_url text, reputation integer, reputation_level text) AS $$
  SELECT id, username, avatar_url, COALESCE(reputation, 0), COALESCE(reputation_level, 'newbie')
  FROM profiles ORDER BY reputation DESC NULLS LAST LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- THREAD SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS thread_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  notify_on_reply boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

CREATE OR REPLACE FUNCTION toggle_thread_subscription(p_thread_id uuid, p_user_id uuid, p_notify boolean DEFAULT true)
RETURNS json AS $$
DECLARE v_existing uuid; v_subscribed boolean;
BEGIN
  SELECT id INTO v_existing FROM thread_subscriptions WHERE thread_id = p_thread_id AND user_id = p_user_id;
  IF v_existing IS NOT NULL THEN
    DELETE FROM thread_subscriptions WHERE id = v_existing; v_subscribed := false;
  ELSE
    INSERT INTO thread_subscriptions (thread_id, user_id, notify_on_reply) VALUES (p_thread_id, p_user_id, p_notify); v_subscribed := true;
  END IF;
  RETURN json_build_object('success', true, 'subscribed', v_subscribed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_subscribed_to_thread(p_thread_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM thread_subscriptions WHERE thread_id = p_thread_id AND user_id = p_user_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- REPORTS SYSTEM
-- ============================================
DO $$ BEGIN CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_reason AS ENUM ('spam', 'harassment', 'inappropriate', 'off_topic', 'duplicate', 'misinformation', 'illegal', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes text,
  action_taken text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION create_report(p_target_type text, p_target_id uuid, p_reason text, p_description text DEFAULT NULL)
RETURNS json AS $$
DECLARE v_reporter_id uuid; v_existing uuid; v_report_id uuid;
BEGIN
  v_reporter_id := auth.uid();
  IF v_reporter_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT id INTO v_existing FROM reports WHERE reporter_id = v_reporter_id AND target_type = p_target_type AND target_id = p_target_id AND status IN ('pending', 'reviewing');
  IF v_existing IS NOT NULL THEN RETURN json_build_object('success', false, 'error', 'Already reported'); END IF;
  INSERT INTO reports (reporter_id, target_type, target_id, reason, description) VALUES (v_reporter_id, p_target_type, p_target_id, p_reason, p_description) RETURNING id INTO v_report_id;
  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILE IMPROVEMENTS & FOLLOWS
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

CREATE OR REPLACE FUNCTION toggle_user_follow(p_following_id uuid)
RETURNS json AS $$
DECLARE v_follower_id uuid; v_existing uuid; v_is_following boolean;
BEGIN
  v_follower_id := auth.uid();
  IF v_follower_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF v_follower_id = p_following_id THEN RETURN json_build_object('success', false, 'error', 'Cannot follow yourself'); END IF;
  SELECT id INTO v_existing FROM user_follows WHERE follower_id = v_follower_id AND following_id = p_following_id;
  IF v_existing IS NOT NULL THEN
    DELETE FROM user_follows WHERE id = v_existing; v_is_following := false;
  ELSE
    INSERT INTO user_follows (follower_id, following_id) VALUES (v_follower_id, p_following_id); v_is_following := true;
  END IF;
  RETURN json_build_object('success', true, 'following', v_is_following);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_following_user(p_following_id uuid)
RETURNS boolean AS $$ SELECT EXISTS (SELECT 1 FROM user_follows WHERE follower_id = auth.uid() AND following_id = p_following_id); $$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_profile_stats(p_user_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'posts_count', (SELECT COUNT(*) FROM posts WHERE author_id = p_user_id),
    'threads_count', (SELECT COUNT(*) FROM threads WHERE author_id = p_user_id),
    'followers_count', (SELECT COUNT(*) FROM user_follows WHERE following_id = p_user_id),
    'following_count', (SELECT COUNT(*) FROM user_follows WHERE follower_id = p_user_id),
    'reputation', (SELECT COALESCE(reputation, 0) FROM profiles WHERE id = p_user_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USER BLOCKING
-- ============================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE OR REPLACE FUNCTION toggle_user_block(p_blocked_id uuid, p_reason text DEFAULT NULL)
RETURNS json AS $$
DECLARE v_blocker_id uuid; v_existing uuid; v_is_blocked boolean;
BEGIN
  v_blocker_id := auth.uid();
  IF v_blocker_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF v_blocker_id = p_blocked_id THEN RETURN json_build_object('success', false, 'error', 'Cannot block yourself'); END IF;
  SELECT id INTO v_existing FROM user_blocks WHERE blocker_id = v_blocker_id AND blocked_id = p_blocked_id;
  IF v_existing IS NOT NULL THEN
    DELETE FROM user_blocks WHERE id = v_existing; v_is_blocked := false;
  ELSE
    INSERT INTO user_blocks (blocker_id, blocked_id, reason) VALUES (v_blocker_id, p_blocked_id, p_reason); v_is_blocked := true;
    DELETE FROM user_follows WHERE (follower_id = v_blocker_id AND following_id = p_blocked_id) OR (follower_id = p_blocked_id AND following_id = v_blocker_id);
  END IF;
  RETURN json_build_object('success', true, 'blocked', v_is_blocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id uuid)
RETURNS boolean AS $$ SELECT EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = auth.uid() AND blocked_id = p_user_id); $$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES (idempotent)
-- ============================================
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reputation history" ON reputation_history;
CREATE POLICY "Anyone can view reputation history" ON reputation_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own subscriptions" ON thread_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON thread_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own subscriptions" ON thread_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON thread_subscriptions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Anyone can view follows" ON user_follows;
CREATE POLICY "Anyone can view follows" ON user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own follows" ON user_follows;
CREATE POLICY "Users can manage own follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can view own blocks" ON user_blocks;
CREATE POLICY "Users can view own blocks" ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can manage own blocks" ON user_blocks;
CREATE POLICY "Users can manage own blocks" ON user_blocks FOR ALL USING (auth.uid() = blocker_id);


-- =============================================
-- FILE: 20260129330000_fix_profile_stats.sql
-- =============================================
-- Fix get_profile_stats to include all required fields
CREATE OR REPLACE FUNCTION get_profile_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'posts_count', (SELECT COUNT(*) FROM posts WHERE author_id = p_user_id),
    'threads_count', (SELECT COUNT(*) FROM threads WHERE author_id = p_user_id),
    'thanks_received', (SELECT COUNT(*) FROM post_thanks pt JOIN posts p ON pt.post_id = p.id WHERE p.author_id = p_user_id),
    'thanks_given', (SELECT COUNT(*) FROM post_thanks WHERE user_id = p_user_id),
    'followers_count', (SELECT COUNT(*) FROM user_follows WHERE following_id = p_user_id),
    'following_count', (SELECT COUNT(*) FROM user_follows WHERE follower_id = p_user_id),
    'profile_views', (SELECT COALESCE(profile_views, 0) FROM profiles WHERE id = p_user_id),
    'reputation', (SELECT COALESCE(reputation, 0) FROM profiles WHERE id = p_user_id),
    'reputation_level', (SELECT COALESCE(reputation_level, 'newbie') FROM profiles WHERE id = p_user_id)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure post_thanks table exists (for thanks_received/thanks_given counts)
CREATE TABLE IF NOT EXISTS post_thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Ensure profile_views column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;

-- Function to increment profile views
CREATE OR REPLACE FUNCTION increment_profile_views(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET profile_views = COALESCE(profile_views, 0) + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- FILE: 20260210000000_banner_ads_system.sql
-- =============================================
-- =============================================
-- SISTEMA DE BANNERS PUBLICITARIOS
-- =============================================

-- Zonas publicitarias (cada paÃ­s = zona home+paÃ­s, cada regiÃ³n = zona ciudad independiente)
CREATE TABLE IF NOT EXISTS banner_ad_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('home_country', 'city')),
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- home_country zones: country_id NOT NULL, region_id NULL
  -- city zones: country_id NOT NULL, region_id NOT NULL
  UNIQUE(zone_type, country_id, region_id)
);

-- Bookings de banners (solicitudes de compra de espacio)
CREATE TABLE IF NOT EXISTS banner_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES banner_ad_zones(id) ON DELETE CASCADE,

  -- PosiciÃ³n y formato
  position VARCHAR(20) NOT NULL CHECK (position IN ('header', 'sidebar_top', 'sidebar_bottom', 'footer', 'content')),
  format VARCHAR(10) NOT NULL CHECK (format IN ('728x90', '300x250')),

  -- Contenido del banner
  image_url TEXT,
  click_url TEXT,

  -- Fechas y duraciÃ³n
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 15, 30, 90, 180)),

  -- Precio
  price_usd NUMERIC(10,2) NOT NULL,

  -- Estado y moderaciÃ³n
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'expired', 'cancelled')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CÃ³digos de fallback del admin (publicidad de terceros tipo JuicyAds)
CREATE TABLE IF NOT EXISTS banner_fallbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES banner_ad_zones(id) ON DELETE CASCADE, -- NULL = fallback global
  position VARCHAR(20) NOT NULL CHECK (position IN ('header', 'sidebar_top', 'sidebar_bottom', 'footer', 'content')),
  format VARCHAR(10) NOT NULL CHECK (format IN ('728x90', '300x250')),
  code_html TEXT NOT NULL, -- JS/HTML de la red publicitaria
  label VARCHAR(100), -- Nombre descriptivo para el admin
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Mayor prioridad = se muestra primero
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics: impresiones y clicks de banners
CREATE TABLE IF NOT EXISTS banner_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES banner_bookings(id) ON DELETE SET NULL,
  fallback_id UUID REFERENCES banner_fallbacks(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES banner_ad_zones(id) ON DELETE SET NULL,
  position VARCHAR(20),
  event_type VARCHAR(15) NOT NULL CHECK (event_type IN ('impression', 'click')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÃNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_banner_zones_type ON banner_ad_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_banner_zones_country ON banner_ad_zones(country_id);
CREATE INDEX IF NOT EXISTS idx_banner_zones_region ON banner_ad_zones(region_id);

CREATE INDEX IF NOT EXISTS idx_banner_bookings_user ON banner_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_zone ON banner_bookings(zone_id);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_status ON banner_bookings(status);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_dates ON banner_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_active ON banner_bookings(zone_id, position, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_banner_fallbacks_zone ON banner_fallbacks(zone_id);
CREATE INDEX IF NOT EXISTS idx_banner_fallbacks_active ON banner_fallbacks(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_banner_impressions_booking ON banner_impressions(booking_id);
CREATE INDEX IF NOT EXISTS idx_banner_impressions_created ON banner_impressions(created_at);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE banner_ad_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_fallbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_impressions ENABLE ROW LEVEL SECURITY;

-- Zonas: visibles para todos (lectura), solo admin puede modificar
CREATE POLICY "Zonas visibles para todos" ON banner_ad_zones
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modifica zonas" ON banner_ad_zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Bookings: usuarios ven los suyos + bookings activos, crean los suyos, admin ve/edita todo
CREATE POLICY "Ver bookings propios y activos" ON banner_bookings
  FOR SELECT USING (
    user_id = auth.uid()
    OR status = 'active'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod'))
  );

CREATE POLICY "Usuarios crean bookings" ON banner_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin y propietario editan bookings" ON banner_bookings
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "Admin elimina bookings" ON banner_bookings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Fallbacks: visibles para renderizado, solo admin gestiona
CREATE POLICY "Fallbacks visibles para renderizado" ON banner_fallbacks
  FOR SELECT USING (true);

CREATE POLICY "Solo admin gestiona fallbacks" ON banner_fallbacks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Impressions: cualquiera inserta (tracking), solo admin lee
CREATE POLICY "Insertar impresiones" ON banner_impressions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin lee impresiones" ON banner_impressions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- =============================================
-- FUNCIONES RPC
-- =============================================

-- Obtener el banner activo para una zona + posiciÃ³n + fecha
CREATE OR REPLACE FUNCTION get_active_banner(
  p_zone_id UUID,
  p_position VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  booking_id UUID,
  image_url TEXT,
  click_url TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bb.id AS booking_id,
    bb.image_url,
    bb.click_url,
    bb.user_id
  FROM banner_bookings bb
  WHERE bb.zone_id = p_zone_id
    AND bb.position = p_position
    AND bb.status = 'active'
    AND p_date >= bb.start_date
    AND p_date <= bb.end_date
  ORDER BY bb.start_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener el cÃ³digo de fallback para una zona + posiciÃ³n
CREATE OR REPLACE FUNCTION get_banner_fallback(
  p_zone_id UUID,
  p_position VARCHAR,
  p_format VARCHAR
)
RETURNS TABLE (
  fallback_id UUID,
  code_html TEXT
) AS $$
BEGIN
  -- Primero buscar fallback especÃ­fico de la zona
  RETURN QUERY
  SELECT bf.id AS fallback_id, bf.code_html
  FROM banner_fallbacks bf
  WHERE bf.is_active = true
    AND bf.position = p_position
    AND bf.format = p_format
    AND (bf.zone_id = p_zone_id OR bf.zone_id IS NULL)
  ORDER BY
    CASE WHEN bf.zone_id IS NOT NULL THEN 0 ELSE 1 END, -- zona especÃ­fica primero
    bf.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar disponibilidad de un slot en un rango de fechas
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_zone_id UUID,
  p_position VARCHAR,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM banner_bookings
  WHERE zone_id = p_zone_id
    AND position = p_position
    AND status IN ('approved', 'active')
    AND start_date < p_end_date
    AND end_date > p_start_date
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener dÃ­as ocupados para un slot en un rango
CREATE OR REPLACE FUNCTION get_occupied_dates(
  p_zone_id UUID,
  p_position VARCHAR,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT (CURRENT_DATE + INTERVAL '365 days')::DATE
)
RETURNS TABLE (
  booking_id UUID,
  start_date DATE,
  end_date DATE,
  username VARCHAR,
  avatar_url TEXT,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bb.id AS booking_id,
    bb.start_date,
    bb.end_date,
    p.username,
    p.avatar_url,
    bb.status
  FROM banner_bookings bb
  JOIN profiles p ON p.id = bb.user_id
  WHERE bb.zone_id = p_zone_id
    AND bb.position = p_position
    AND bb.status IN ('approved', 'active', 'pending')
    AND bb.start_date <= p_to_date
    AND bb.end_date >= p_from_date
  ORDER BY bb.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activar bookings aprobados cuya fecha de inicio es hoy
CREATE OR REPLACE FUNCTION activate_due_bookings()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE banner_bookings
  SET status = 'active', updated_at = NOW()
  WHERE status = 'approved'
    AND start_date <= CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Expirar bookings activos cuya fecha de fin pasÃ³
  UPDATE banner_bookings
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generar zonas publicitarias para todos los paÃ­ses y regiones existentes
CREATE OR REPLACE FUNCTION seed_banner_zones()
RETURNS void AS $$
BEGIN
  -- Crear zonas home_country para cada paÃ­s
  INSERT INTO banner_ad_zones (zone_type, country_id, region_id, name)
  SELECT 'home_country', c.id, NULL, 'Home + ' || c.name
  FROM countries c
  ON CONFLICT (zone_type, country_id, region_id) DO NOTHING;

  -- Crear zonas city para cada regiÃ³n
  INSERT INTO banner_ad_zones (zone_type, country_id, region_id, name)
  SELECT 'city', r.country_id, r.id, r.name
  FROM regions r
  ON CONFLICT (zone_type, country_id, region_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar seed inicial
SELECT seed_banner_zones();



