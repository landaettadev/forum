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
