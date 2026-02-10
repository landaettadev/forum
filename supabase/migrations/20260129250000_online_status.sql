-- Online status tracking for users

-- Add last_seen column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Index for efficient online user queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(is_online) WHERE is_online = true;

-- Function to update user's online status
CREATE OR REPLACE FUNCTION update_user_presence(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    last_seen_at = now(),
    is_online = true
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark user as offline
CREATE OR REPLACE FUNCTION mark_user_offline(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET is_online = false
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get online users count
CREATE OR REPLACE FUNCTION get_online_users_count()
RETURNS bigint AS $$
  SELECT COUNT(*) FROM profiles 
  WHERE is_online = true 
  OR last_seen_at > now() - interval '5 minutes';
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get recently active users
CREATE OR REPLACE FUNCTION get_online_users(p_limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  last_seen_at timestamptz,
  is_online boolean
) AS $$
  SELECT 
    id as user_id,
    username,
    avatar_url,
    last_seen_at,
    CASE 
      WHEN is_online = true OR last_seen_at > now() - interval '5 minutes' 
      THEN true 
      ELSE false 
    END as is_online
  FROM profiles
  WHERE last_seen_at > now() - interval '30 minutes'
  ORDER BY last_seen_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- Scheduled job to mark inactive users as offline (run every 5 minutes)
-- This would be set up in Supabase dashboard or via cron
-- UPDATE profiles SET is_online = false WHERE last_seen_at < now() - interval '5 minutes' AND is_online = true;
