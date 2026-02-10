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
