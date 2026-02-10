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
