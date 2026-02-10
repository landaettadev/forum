-- =============================================
-- Advanced Moderation System
-- Roles, Warnings, Ratings, Word Filters
-- =============================================

-- Update role enum to include new moderator types
-- admin: Full access, super ban
-- super_mod: Can suspend, do everything except super ban
-- mod: Basic moderator - delete comments, send warnings
-- country_mod: Same as mod but limited to assigned countries
-- user: Regular user

-- Add moderator_type and country assignments to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moderator_type TEXT DEFAULT NULL 
  CHECK (moderator_type IS NULL OR moderator_type IN ('super', 'basic', 'country'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moderated_countries UUID[] DEFAULT NULL;

-- =============================================
-- Word/URL Filters
-- =============================================
CREATE TABLE IF NOT EXISTS content_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type TEXT NOT NULL CHECK (filter_type IN ('word', 'url', 'phrase')),
  pattern TEXT NOT NULL,
  replacement TEXT DEFAULT 'xxx',
  is_regex BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_filters_active ON content_filters(is_active) WHERE is_active = TRUE;

-- =============================================
-- User Warnings System
-- =============================================
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT CHECK (char_length(description) <= 200),
  points INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  is_active BOOLEAN DEFAULT TRUE,
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  related_thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warnings_user ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_active ON user_warnings(is_active, expires_at);

-- Add warning points counter to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_warnings_received INTEGER DEFAULT 0;

-- =============================================
-- User Ratings (Likes/Dislikes)
-- =============================================
CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating IN (-1, 1)), -- -1 = dislike, 1 = like
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rater_id, rated_user_id),
  CHECK (rater_id != rated_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater ON user_ratings(rater_id);

-- Add rating counters to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS likes_received INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dislikes_received INTEGER DEFAULT 0;

-- =============================================
-- Enhanced Reports System
-- =============================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' 
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'
  CHECK (category IN ('spam', 'harassment', 'inappropriate', 'scam', 'other'));

-- =============================================
-- Enhanced Suspensions
-- =============================================
ALTER TABLE user_suspensions ADD COLUMN IF NOT EXISTS description TEXT CHECK (char_length(description) <= 200);
ALTER TABLE user_suspensions ADD COLUMN IF NOT EXISTS suspension_type TEXT DEFAULT 'temporary'
  CHECK (suspension_type IN ('temporary', 'permanent', 'super_ban'));

-- =============================================
-- Functions
-- =============================================

-- Function to apply content filters
CREATE OR REPLACE FUNCTION apply_content_filters(content TEXT)
RETURNS TEXT AS $$
DECLARE
  filter RECORD;
  result TEXT := content;
BEGIN
  FOR filter IN SELECT * FROM content_filters WHERE is_active = TRUE
  LOOP
    IF filter.is_regex THEN
      result := regexp_replace(result, filter.pattern, filter.replacement, 'gi');
    ELSE
      result := replace(result, filter.pattern, filter.replacement);
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check content for blocked patterns (returns true if content is clean)
CREATE OR REPLACE FUNCTION check_content_clean(content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  filter RECORD;
BEGIN
  FOR filter IN SELECT * FROM content_filters WHERE is_active = TRUE
  LOOP
    IF filter.is_regex THEN
      IF content ~* filter.pattern THEN
        RETURN FALSE;
      END IF;
    ELSE
      IF position(lower(filter.pattern) in lower(content)) > 0 THEN
        RETURN FALSE;
      END IF;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update user warning points
CREATE OR REPLACE FUNCTION update_user_warning_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET warning_points = warning_points + NEW.points,
        total_warnings_received = total_warnings_received + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET warning_points = GREATEST(warning_points - OLD.points, 0)
    WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE profiles 
    SET warning_points = GREATEST(warning_points - OLD.points, 0)
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_warning_points ON user_warnings;
CREATE TRIGGER trigger_warning_points
  AFTER INSERT OR UPDATE OR DELETE ON user_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_warning_points();

-- Function to update user rating counts
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.rating = 1 THEN
      UPDATE profiles SET likes_received = likes_received + 1 WHERE id = NEW.rated_user_id;
    ELSE
      UPDATE profiles SET dislikes_received = dislikes_received + 1 WHERE id = NEW.rated_user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.rating = 1 THEN
      UPDATE profiles SET likes_received = GREATEST(likes_received - 1, 0) WHERE id = OLD.rated_user_id;
    ELSE
      UPDATE profiles SET dislikes_received = GREATEST(dislikes_received - 1, 0) WHERE id = OLD.rated_user_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.rating != NEW.rating THEN
    IF NEW.rating = 1 THEN
      UPDATE profiles 
      SET likes_received = likes_received + 1,
          dislikes_received = GREATEST(dislikes_received - 1, 0)
      WHERE id = NEW.rated_user_id;
    ELSE
      UPDATE profiles 
      SET likes_received = GREATEST(likes_received - 1, 0),
          dislikes_received = dislikes_received + 1
      WHERE id = NEW.rated_user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_ratings ON user_ratings;
CREATE TRIGGER trigger_user_ratings
  AFTER INSERT OR UPDATE OR DELETE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings();

-- Function to expire old warnings (run via cron)
CREATE OR REPLACE FUNCTION expire_old_warnings()
RETURNS void AS $$
BEGIN
  UPDATE user_warnings 
  SET is_active = FALSE 
  WHERE is_active = TRUE 
    AND expires_at < NOW();
    
  -- Recalculate warning points for affected users
  UPDATE profiles p
  SET warning_points = COALESCE((
    SELECT SUM(points) 
    FROM user_warnings w 
    WHERE w.user_id = p.id AND w.is_active = TRUE
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can moderate a country
CREATE OR REPLACE FUNCTION can_moderate_country(mod_user_id UUID, country_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  mod_type TEXT;
  assigned_countries UUID[];
BEGIN
  SELECT role, moderator_type, moderated_countries 
  INTO user_role, mod_type, assigned_countries
  FROM profiles WHERE id = mod_user_id;
  
  -- Admin and super_mod can moderate everything
  IF user_role = 'admin' OR mod_type = 'super' THEN
    RETURN TRUE;
  END IF;
  
  -- Country moderator can only moderate assigned countries
  IF mod_type = 'country' AND assigned_countries IS NOT NULL THEN
    RETURN country_id = ANY(assigned_countries);
  END IF;
  
  -- Basic moderator can moderate everything (but with limited actions)
  IF user_role = 'mod' OR mod_type = 'basic' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to perform super ban (delete user and all content)
CREATE OR REPLACE FUNCTION super_ban_user(target_user_id UUID, admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Check if executor is admin
  SELECT role INTO admin_role FROM profiles WHERE id = admin_id;
  IF admin_role != 'admin' THEN
    RETURN FALSE;
  END IF;
  
  -- Delete all user content
  DELETE FROM posts WHERE author_id = target_user_id;
  DELETE FROM threads WHERE author_id = target_user_id;
  DELETE FROM chat_messages WHERE sender_id = target_user_id;
  DELETE FROM profile_posts WHERE author_id = target_user_id;
  DELETE FROM media_gallery WHERE user_id = target_user_id;
  
  -- Log the super ban
  INSERT INTO moderation_logs (moderator_id, target_user_id, action, reason)
  VALUES (admin_id, target_user_id, 'delete_user', 'Super ban - usuario y contenido eliminado');
  
  -- Delete the user profile
  DELETE FROM profiles WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS Policies
-- =============================================

-- Content filters (only admin/mods can manage)
ALTER TABLE content_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mods can view content filters"
  ON content_filters FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod')));

CREATE POLICY "Admin can manage content filters"
  ON content_filters FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- User warnings
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mods can view warnings"
  ON user_warnings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod')));

CREATE POLICY "Mods can insert warnings"
  ON user_warnings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod')));

CREATE POLICY "Admin and super mods can update warnings"
  ON user_warnings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR moderator_type = 'super')
  ));

CREATE POLICY "Admin can delete warnings"
  ON user_warnings FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- User ratings
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON user_ratings FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can rate"
  ON user_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can update their own ratings"
  ON user_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = rater_id);

CREATE POLICY "Users can delete their own ratings"
  ON user_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = rater_id);

-- =============================================
-- Add new action types to moderation_logs
-- =============================================
ALTER TABLE moderation_logs DROP CONSTRAINT IF EXISTS moderation_logs_action_check;
ALTER TABLE moderation_logs ADD CONSTRAINT moderation_logs_action_check CHECK (action IN (
  'warn', 'delete_post', 'delete_thread', 'edit_post', 'edit_thread',
  'lock_thread', 'unlock_thread', 'pin_thread', 'unpin_thread',
  'ban', 'unban', 'suspend', 'unsuspend', 
  'ip_ban', 'ip_unban', 'super_ban',
  'verify', 'unverify',
  'promote', 'demote', 'delete_user',
  'move_thread', 'merge_threads', 'split_thread',
  'add_filter', 'remove_filter',
  'assign_country_mod', 'remove_country_mod'
));

-- =============================================
-- Seed some default content filters
-- =============================================
INSERT INTO content_filters (filter_type, pattern, replacement, is_regex, is_active) VALUES
('url', 'http://', 'xxx', FALSE, TRUE),
('url', 'https://', 'xxx', FALSE, TRUE)
ON CONFLICT DO NOTHING;
