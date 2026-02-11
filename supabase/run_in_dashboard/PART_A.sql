-- =============================================
-- FILE: 20260129110000_add_thread_tags.sql
-- =============================================
-- Add tag system to threads
-- Tags: review, ask, general

-- Add tag column to threads table
ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS tag TEXT CHECK (tag IN ('review', 'ask', 'general'));

-- Set default tag for existing threads
UPDATE threads SET tag = 'general' WHERE tag IS NULL;

-- Make tag required for new threads
ALTER TABLE threads
  ALTER COLUMN tag SET NOT NULL,
  ALTER COLUMN tag SET DEFAULT 'general';


-- =============================================
-- FILE: 20260129120000_create_storage_bucket.sql
-- =============================================
-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Allow public read access to media bucket
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid() = owner::uuid);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid() = owner::uuid);


-- =============================================
-- FILE: 20260129130000_user_badges_ip_bans.sql
-- =============================================
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


-- =============================================
-- FILE: 20260129140000_advanced_moderation_system.sql
-- =============================================
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


-- =============================================
-- FILE: 20260129150000_escort_profiles_custom_badges.sql
-- =============================================
-- =====================================================
-- ESCORT PROFILES AND CUSTOM BADGES SYSTEM
-- =====================================================

-- Add is_escort flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_escort BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escort_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escort_verified_by UUID REFERENCES profiles(id);

-- Create custom badges table (manageable by mods)
CREATE TABLE IF NOT EXISTS custom_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'award', -- lucide icon name
  color VARCHAR(20) DEFAULT 'purple', -- tailwind color
  bg_color VARCHAR(20) DEFAULT 'purple',
  badge_type VARCHAR(20) NOT NULL DEFAULT 'positive' CHECK (badge_type IN ('positive', 'negative', 'neutral', 'special')),
  is_active BOOLEAN DEFAULT TRUE,
  can_be_assigned_by VARCHAR(20) DEFAULT 'mod' CHECK (can_be_assigned_by IN ('admin', 'super_mod', 'mod')),
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_custom_badges junction table
CREATE TABLE IF NOT EXISTS user_custom_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES custom_badges(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  expires_at TIMESTAMPTZ, -- NULL = permanent
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, badge_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_custom_badges_user ON user_custom_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_badges_badge ON user_custom_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_custom_badges_type ON custom_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_profiles_escort ON profiles(is_escort) WHERE is_escort = TRUE;

-- Insert default custom badges
INSERT INTO custom_badges (name, display_name, description, icon, color, bg_color, badge_type, can_be_assigned_by, display_order) VALUES
-- Positive badges
('legendary_reviewer', 'ReseÃ±ador Legendario', 'Usuario con reseÃ±as de alta calidad y gran reputaciÃ³n', 'crown', 'yellow', 'yellow', 'positive', 'mod', 1),
('trusted_reviewer', 'ReseÃ±ador Confiable', 'Usuario verificado con historial de reseÃ±as precisas', 'shield-check', 'green', 'green', 'positive', 'mod', 2),
('top_contributor', 'Top Contribuidor', 'Uno de los usuarios mÃ¡s activos de la comunidad', 'trophy', 'amber', 'amber', 'positive', 'mod', 3),
('expert_reviewer', 'Experto en ReseÃ±as', 'Conocedor experimentado del tema', 'graduation-cap', 'blue', 'blue', 'positive', 'mod', 4),
('helpful_member', 'Miembro Ãštil', 'Siempre ayuda a otros miembros', 'heart-handshake', 'pink', 'pink', 'positive', 'mod', 5),
('veteran', 'Veterano', 'Miembro de larga data en la comunidad', 'medal', 'slate', 'slate', 'positive', 'mod', 6),

-- Negative/Warning badges
('dubious_reviewer', 'ReseÃ±ador Dudoso', 'ReseÃ±as de este usuario deben verificarse', 'alert-triangle', 'orange', 'orange', 'negative', 'mod', 10),
('unreliable', 'No Confiable', 'Historial de informaciÃ³n incorrecta o engaÃ±osa', 'alert-octagon', 'red', 'red', 'negative', 'mod', 11),
('suspected_fake', 'Sospecha de Fake', 'Posible cuenta falsa o spam', 'user-x', 'red', 'red', 'negative', 'super_mod', 12),
('under_review', 'En RevisiÃ³n', 'Cuenta bajo revisiÃ³n por moderadores', 'eye', 'gray', 'gray', 'negative', 'mod', 13),

-- Neutral badges
('new_reviewer', 'Nuevo ReseÃ±ador', 'Usuario nuevo, pocas reseÃ±as aÃºn', 'sparkles', 'cyan', 'cyan', 'neutral', 'mod', 20),
('comeback', 'De Vuelta', 'Usuario que ha regresado despuÃ©s de un tiempo', 'rotate-ccw', 'indigo', 'indigo', 'neutral', 'mod', 21),

-- Special badges
('escort_verified', 'Escort Verificada', 'Perfil de escort verificado oficialmente', 'badge-check', 'fuchsia', 'fuchsia', 'special', 'super_mod', 30),
('official_account', 'Cuenta Oficial', 'Cuenta oficial verificada', 'verified', 'blue', 'blue', 'special', 'admin', 31),
('partner', 'Partner', 'Colaborador oficial del sitio', 'handshake', 'emerald', 'emerald', 'special', 'admin', 32),
('premium_escort', 'Escort Premium', 'Escort con membresÃ­a premium', 'gem', 'violet', 'violet', 'special', 'admin', 33)
ON CONFLICT (name) DO NOTHING;

-- Function to check if user can assign badge based on role
CREATE OR REPLACE FUNCTION can_assign_badge(
  assigner_role TEXT,
  assigner_mod_type TEXT,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin can assign all
  IF assigner_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Super mod can assign mod and super_mod badges
  IF assigner_mod_type = 'super' AND required_permission IN ('mod', 'super_mod') THEN
    RETURN TRUE;
  END IF;
  
  -- Basic mod can only assign mod badges
  IF assigner_role = 'mod' AND required_permission = 'mod' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark profile as escort
CREATE OR REPLACE FUNCTION set_escort_profile(
  target_user_id UUID,
  verifier_id UUID,
  is_escort_value BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    is_escort = is_escort_value,
    escort_verified_at = CASE WHEN is_escort_value THEN NOW() ELSE NULL END,
    escort_verified_by = CASE WHEN is_escort_value THEN verifier_id ELSE NULL END
  WHERE id = target_user_id;
  
  -- Also assign/remove the escort_verified badge
  IF is_escort_value THEN
    INSERT INTO user_custom_badges (user_id, badge_id, assigned_by, reason)
    SELECT target_user_id, id, verifier_id, 'Perfil de escort verificado'
    FROM custom_badges WHERE name = 'escort_verified'
    ON CONFLICT (user_id, badge_id) DO UPDATE SET is_active = TRUE, assigned_at = NOW();
  ELSE
    UPDATE user_custom_badges 
    SET is_active = FALSE 
    WHERE user_id = target_user_id 
    AND badge_id = (SELECT id FROM custom_badges WHERE name = 'escort_verified');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE custom_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can view badges
DROP POLICY IF EXISTS "Anyone can view custom badges" ON custom_badges;
CREATE POLICY "Anyone can view custom badges" ON custom_badges
  FOR SELECT TO public USING (TRUE);

-- Only admins can manage badge definitions
DROP POLICY IF EXISTS "Admins can manage badges" ON custom_badges;
CREATE POLICY "Admins can manage badges" ON custom_badges
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Everyone can view user badges
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_custom_badges;
CREATE POLICY "Anyone can view user badges" ON user_custom_badges
  FOR SELECT TO public USING (TRUE);

-- Mods can assign badges based on permissions
DROP POLICY IF EXISTS "Mods can assign badges" ON user_custom_badges;
CREATE POLICY "Mods can assign badges" ON user_custom_badges
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p, custom_badges cb
      WHERE p.id = auth.uid() 
      AND cb.id = badge_id
      AND can_assign_badge(p.role, p.moderator_type, cb.can_be_assigned_by)
    )
  );

-- Mods can update badge assignments
DROP POLICY IF EXISTS "Mods can update badge assignments" ON user_custom_badges;
CREATE POLICY "Mods can update badge assignments" ON user_custom_badges
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.role IN ('admin', 'mod') OR p.moderator_type IS NOT NULL)
    )
  );

-- Admins can delete badge assignments
DROP POLICY IF EXISTS "Admins can delete badge assignments" ON user_custom_badges;
CREATE POLICY "Admins can delete badge assignments" ON user_custom_badges
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- =============================================
-- FILE: 20260129160000_thanks_quotes_bookmarks.sql
-- =============================================
-- =============================================
-- FASE 1: InteracciÃ³n BÃ¡sica
-- Thanks, Quotes, Bookmarks
-- =============================================

-- =============================================
-- 1.1 SISTEMA DE GRACIAS (THANKS)
-- =============================================

-- Tabla para registrar los agradecimientos
CREATE TABLE IF NOT EXISTS post_thanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Un usuario solo puede agradecer una vez por post
);

-- Ãndices para bÃºsquedas rÃ¡pidas
CREATE INDEX IF NOT EXISTS idx_post_thanks_post_id ON post_thanks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_thanks_user_id ON post_thanks(user_id);

-- FunciÃ³n para agradecer un post
CREATE OR REPLACE FUNCTION thank_post(p_post_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_post_author_id UUID;
  v_already_thanked BOOLEAN;
  v_thanks_count INT;
BEGIN
  -- Obtener el autor del post
  SELECT author_id INTO v_post_author_id FROM posts WHERE id = p_post_id;
  
  -- No permitir auto-agradecimiento
  IF v_post_author_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_thank_own_post');
  END IF;
  
  -- Verificar si ya agradeciÃ³
  SELECT EXISTS(
    SELECT 1 FROM post_thanks WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_already_thanked;
  
  IF v_already_thanked THEN
    -- Quitar agradecimiento
    DELETE FROM post_thanks WHERE post_id = p_post_id AND user_id = p_user_id;
    
    -- Decrementar contador del autor
    UPDATE profiles 
    SET thanks_received = GREATEST(0, thanks_received - 1),
        points = GREATEST(0, points - 3)
    WHERE id = v_post_author_id;
    
    SELECT COUNT(*) INTO v_thanks_count FROM post_thanks WHERE post_id = p_post_id;
    
    RETURN jsonb_build_object('success', true, 'action', 'unthanked', 'thanks_count', v_thanks_count);
  ELSE
    -- Agregar agradecimiento
    INSERT INTO post_thanks (post_id, user_id) VALUES (p_post_id, p_user_id);
    
    -- Incrementar contador del autor
    UPDATE profiles 
    SET thanks_received = thanks_received + 1,
        points = points + 3
    WHERE id = v_post_author_id;
    
    SELECT COUNT(*) INTO v_thanks_count FROM post_thanks WHERE post_id = p_post_id;
    
    RETURN jsonb_build_object('success', true, 'action', 'thanked', 'thanks_count', v_thanks_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para post_thanks
ALTER TABLE post_thanks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view thanks" ON post_thanks;
CREATE POLICY "Anyone can view thanks" ON post_thanks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can thank" ON post_thanks;
CREATE POLICY "Authenticated users can thank" ON post_thanks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their thanks" ON post_thanks;
CREATE POLICY "Users can remove their thanks" ON post_thanks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 1.2 SISTEMA DE CITAS (QUOTES)
-- No necesita tabla, se almacena en el contenido del post
-- Solo aÃ±adimos un campo para referenciar posts citados
-- =============================================

-- AÃ±adir campo para citas en posts (JSON array de post IDs citados)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS quoted_posts UUID[] DEFAULT '{}';

-- =============================================
-- 1.3 SISTEMA DE FAVORITOS (BOOKMARKS)
-- =============================================

-- Tabla de favoritos de hilos
CREATE TABLE IF NOT EXISTS thread_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_name VARCHAR(100) DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_thread_bookmarks_user_id ON thread_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_bookmarks_thread_id ON thread_bookmarks(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_bookmarks_folder ON thread_bookmarks(user_id, folder_name);

-- Tabla de favoritos de posts especÃ­ficos
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_name VARCHAR(100) DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON post_bookmarks(post_id);

-- FunciÃ³n para toggle bookmark de hilo
CREATE OR REPLACE FUNCTION toggle_thread_bookmark(
  p_thread_id UUID, 
  p_user_id UUID,
  p_folder_name VARCHAR DEFAULT 'General',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_is_bookmarked BOOLEAN;
BEGIN
  -- Verificar si ya existe
  SELECT id INTO v_existing_id 
  FROM thread_bookmarks 
  WHERE thread_id = p_thread_id AND user_id = p_user_id;
  
  IF v_existing_id IS NOT NULL THEN
    -- Quitar favorito
    DELETE FROM thread_bookmarks WHERE id = v_existing_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'bookmarked', false);
  ELSE
    -- AÃ±adir favorito
    INSERT INTO thread_bookmarks (thread_id, user_id, folder_name, notes)
    VALUES (p_thread_id, p_user_id, p_folder_name, p_notes);
    RETURN jsonb_build_object('success', true, 'action', 'added', 'bookmarked', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para toggle bookmark de post
CREATE OR REPLACE FUNCTION toggle_post_bookmark(
  p_post_id UUID, 
  p_user_id UUID,
  p_folder_name VARCHAR DEFAULT 'General',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id 
  FROM post_bookmarks 
  WHERE post_id = p_post_id AND user_id = p_user_id;
  
  IF v_existing_id IS NOT NULL THEN
    DELETE FROM post_bookmarks WHERE id = v_existing_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'bookmarked', false);
  ELSE
    INSERT INTO post_bookmarks (post_id, user_id, folder_name, notes)
    VALUES (p_post_id, p_user_id, p_folder_name, p_notes);
    RETURN jsonb_build_object('success', true, 'action', 'added', 'bookmarked', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para thread_bookmarks
ALTER TABLE thread_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can view own bookmarks" ON thread_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can create bookmarks" ON thread_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can update own bookmarks" ON thread_bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON thread_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS para post_bookmarks
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can view own post bookmarks" ON post_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can create post bookmarks" ON post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can update own post bookmarks" ON post_bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can delete own post bookmarks" ON post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Vista para obtener bookmarks con info del hilo
-- =============================================
DROP VIEW IF EXISTS user_thread_bookmarks_view;
CREATE VIEW user_thread_bookmarks_view WITH (security_invoker = true) AS
SELECT 
  tb.id,
  tb.user_id,
  tb.folder_name,
  tb.notes,
  tb.created_at as bookmarked_at,
  t.id as thread_id,
  t.title,
  t.created_at as thread_created_at,
  t.replies_count,
  t.views_count,
  t.is_pinned,
  t.is_locked,
  f.name as category_name,
  f.slug as category_slug,
  p.username as author_username,
  p.avatar_url as author_avatar
FROM thread_bookmarks tb
JOIN threads t ON tb.thread_id = t.id
JOIN forums f ON t.forum_id = f.id
JOIN profiles p ON t.author_id = p.id;



