-- Reputation system for users

-- Add reputation column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_level text DEFAULT 'newbie';

-- Reputation history table
CREATE TABLE IF NOT EXISTS reputation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  source_type text, -- 'post_thanks', 'reaction', 'thread_views', 'badge', etc.
  source_id uuid, -- ID of the related entity
  given_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reputation_history_user ON reputation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_history_created ON reputation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_reputation ON profiles(reputation DESC);

-- RLS
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reputation history" ON reputation_history FOR SELECT USING (true);

-- Reputation levels based on points
-- newbie: 0-49
-- member: 50-199
-- active: 200-499
-- trusted: 500-999
-- expert: 1000-2499
-- master: 2500-4999
-- legend: 5000+

-- Function to calculate reputation level
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

-- Function to add reputation
CREATE OR REPLACE FUNCTION add_reputation(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_source_type text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_given_by uuid DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_new_rep integer;
  v_new_level text;
  v_old_level text;
BEGIN
  -- Get current level
  SELECT reputation_level INTO v_old_level FROM profiles WHERE id = p_user_id;

  -- Update reputation
  UPDATE profiles 
  SET reputation = GREATEST(0, reputation + p_amount)
  WHERE id = p_user_id
  RETURNING reputation INTO v_new_rep;

  -- Calculate new level
  v_new_level := get_reputation_level(v_new_rep);

  -- Update level if changed
  IF v_new_level != v_old_level THEN
    UPDATE profiles SET reputation_level = v_new_level WHERE id = p_user_id;
  END IF;

  -- Record history
  INSERT INTO reputation_history (user_id, amount, reason, source_type, source_id, given_by)
  VALUES (p_user_id, p_amount, p_reason, p_source_type, p_source_id, p_given_by);

  RETURN json_build_object(
    'success', true,
    'new_reputation', v_new_rep,
    'new_level', v_new_level,
    'level_changed', v_new_level != v_old_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to award reputation on thanks
CREATE OR REPLACE FUNCTION on_thanks_reputation()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author uuid;
BEGIN
  -- Get post author
  SELECT author_id INTO v_post_author FROM posts WHERE id = NEW.post_id;
  
  IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
    PERFORM add_reputation(
      v_post_author,
      5,
      'Recibió un agradecimiento',
      'post_thanks',
      NEW.post_id,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_thanks_add_rep ON post_thanks;
CREATE TRIGGER on_post_thanks_add_rep
  AFTER INSERT ON post_thanks
  FOR EACH ROW
  EXECUTE FUNCTION on_thanks_reputation();

-- Trigger to award reputation on reactions
CREATE OR REPLACE FUNCTION on_reaction_reputation()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author uuid;
BEGIN
  -- Get post author
  SELECT author_id INTO v_post_author FROM posts WHERE id = NEW.post_id;
  
  IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
    PERFORM add_reputation(
      v_post_author,
      2,
      'Recibió una reacción',
      'reaction',
      NEW.post_id,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_reaction_add_rep ON post_reactions;
CREATE TRIGGER on_post_reaction_add_rep
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION on_reaction_reputation();

-- Function to get user reputation stats
CREATE OR REPLACE FUNCTION get_user_reputation_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_history json;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  SELECT json_agg(row_to_json(h)) INTO v_history
  FROM (
    SELECT amount, reason, source_type, created_at
    FROM reputation_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 20
  ) h;

  RETURN json_build_object(
    'reputation', COALESCE(v_profile.reputation, 0),
    'level', COALESCE(v_profile.reputation_level, 'newbie'),
    'history', COALESCE(v_history, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reputation leaderboard
CREATE OR REPLACE FUNCTION get_reputation_leaderboard(p_limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  reputation integer,
  reputation_level text
) AS $$
  SELECT 
    id as user_id,
    username,
    avatar_url,
    COALESCE(reputation, 0) as reputation,
    COALESCE(reputation_level, 'newbie') as reputation_level
  FROM profiles
  ORDER BY reputation DESC NULLS LAST
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;
