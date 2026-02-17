-- =====================================================
-- FIX: Follow system - ensure functions and policies work
-- Run this in Supabase SQL Editor
-- =====================================================

-- Ensure user_follows table exists with correct structure
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;

-- Create policies
CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- Drop and recreate toggle function
DROP FUNCTION IF EXISTS toggle_user_follow(uuid);

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
  
  SELECT id INTO v_existing FROM user_follows 
  WHERE follower_id = v_follower_id AND following_id = p_following_id;
  
  IF v_existing IS NOT NULL THEN
    DELETE FROM user_follows WHERE id = v_existing;
    v_is_following := false;
  ELSE
    INSERT INTO user_follows (follower_id, following_id) 
    VALUES (v_follower_id, p_following_id);
    v_is_following := true;
  END IF;
  
  RETURN json_build_object('success', true, 'following', v_is_following);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate check function
DROP FUNCTION IF EXISTS is_following_user(uuid);

CREATE OR REPLACE FUNCTION is_following_user(p_following_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = auth.uid() AND following_id = p_following_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION toggle_user_follow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_following_user(uuid) TO authenticated;
