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
