-- Automatic badges system based on user achievements

-- Table for badge definitions
CREATE TABLE IF NOT EXISTS badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_es text,
  name_en text,
  description text,
  description_es text,
  description_en text,
  icon text NOT NULL, -- emoji or icon name
  color text DEFAULT '#6366f1',
  category text DEFAULT 'achievement', -- achievement, milestone, special
  requirement_type text, -- posts, threads, thanks, reactions, days_member, verified, etc.
  requirement_value integer,
  is_automatic boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table for user badges
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id text REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Insert default badges
INSERT INTO badges (id, name, name_es, name_en, description, description_es, description_en, icon, color, category, requirement_type, requirement_value, display_order) VALUES
  -- Post milestones
  ('first_post', 'Primer Post', 'Primer Post', 'First Post', 'Publicaste tu primer post', 'Publicaste tu primer post', 'You published your first post', '✏️', '#10b981', 'milestone', 'posts', 1, 1),
  ('active_poster', 'Activo', 'Activo', 'Active Poster', '10 posts publicados', '10 posts publicados', '10 posts published', '💬', '#3b82f6', 'milestone', 'posts', 10, 2),
  ('prolific_writer', 'Escritor Prolífico', 'Escritor Prolífico', 'Prolific Writer', '50 posts publicados', '50 posts publicados', '50 posts published', '📝', '#8b5cf6', 'milestone', 'posts', 50, 3),
  ('forum_veteran', 'Veterano', 'Veterano', 'Forum Veteran', '100 posts publicados', '100 posts publicados', '100 posts published', '🏆', '#f59e0b', 'milestone', 'posts', 100, 4),
  ('legend', 'Leyenda', 'Leyenda', 'Legend', '500 posts publicados', '500 posts publicados', '500 posts published', '👑', '#ef4444', 'milestone', 'posts', 500, 5),

  -- Thread milestones
  ('thread_starter', 'Iniciador', 'Iniciador', 'Thread Starter', 'Creaste tu primer hilo', 'Creaste tu primer hilo', 'You created your first thread', '🧵', '#06b6d4', 'milestone', 'threads', 1, 10),
  ('conversation_maker', 'Conversador', 'Conversador', 'Conversation Maker', '5 hilos creados', '5 hilos creados', '5 threads created', '💡', '#14b8a6', 'milestone', 'threads', 5, 11),
  ('topic_master', 'Maestro de Temas', 'Maestro de Temas', 'Topic Master', '25 hilos creados', '25 hilos creados', '25 threads created', '🎯', '#f97316', 'milestone', 'threads', 25, 12),

  -- Thanks/appreciation
  ('appreciated', 'Apreciado', 'Apreciado', 'Appreciated', 'Recibiste 10 agradecimientos', 'Recibiste 10 agradecimientos', 'Received 10 thanks', '🙏', '#ec4899', 'achievement', 'thanks', 10, 20),
  ('helpful', 'Útil', 'Útil', 'Helpful', 'Recibiste 50 agradecimientos', 'Recibiste 50 agradecimientos', 'Received 50 thanks', '🤝', '#d946ef', 'achievement', 'thanks', 50, 21),
  ('community_helper', 'Ayudante', 'Ayudante de la Comunidad', 'Community Helper', 'Recibiste 100 agradecimientos', 'Recibiste 100 agradecimientos', 'Received 100 thanks', '⭐', '#a855f7', 'achievement', 'thanks', 100, 22),

  -- Time-based
  ('newcomer', 'Novato', 'Novato', 'Newcomer', 'Te uniste al foro', 'Te uniste al foro', 'You joined the forum', '🌱', '#22c55e', 'milestone', 'days_member', 0, 30),
  ('regular', 'Regular', 'Regular', 'Regular', '30 días como miembro', '30 días como miembro', '30 days as member', '📅', '#0ea5e9', 'milestone', 'days_member', 30, 31),
  ('established', 'Establecido', 'Establecido', 'Established', '90 días como miembro', '90 días como miembro', '90 days as member', '🏠', '#6366f1', 'milestone', 'days_member', 90, 32),
  ('oldtimer', 'Veterano', 'Antiguo', 'Old Timer', '365 días como miembro', '365 días como miembro', '365 days as member', '🎖️', '#eab308', 'milestone', 'days_member', 365, 33),

  -- Special
  ('verified_user', 'Verificado', 'Verificado', 'Verified', 'Usuario verificado', 'Usuario verificado', 'Verified user', '✓', '#22c55e', 'special', 'verified', 1, 40),
  ('early_adopter', 'Early Adopter', 'Pionero', 'Early Adopter', 'Entre los primeros 100 usuarios', 'Entre los primeros 100 usuarios', 'Among the first 100 users', '🚀', '#f43f5e', 'special', 'early_adopter', 100, 41)
ON CONFLICT (id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);

-- RLS policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view user badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can award badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Function to check and award badges for a user
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_badge badges%ROWTYPE;
  v_days_member integer;
  v_user_rank integer;
  v_awarded_badges text[] := '{}';
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Calculate days as member
  v_days_member := EXTRACT(DAY FROM (now() - v_profile.created_at));

  -- Check each automatic badge
  FOR v_badge IN SELECT * FROM badges WHERE is_automatic = true
  LOOP
    -- Skip if user already has this badge
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN
      CONTINUE;
    END IF;

    -- Check requirement based on type
    CASE v_badge.requirement_type
      WHEN 'posts' THEN
        IF COALESCE(v_profile.posts_count, 0) >= v_badge.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
          v_awarded_badges := array_append(v_awarded_badges, v_badge.id);
        END IF;

      WHEN 'threads' THEN
        IF COALESCE(v_profile.threads_count, 0) >= v_badge.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
          v_awarded_badges := array_append(v_awarded_badges, v_badge.id);
        END IF;

      WHEN 'thanks' THEN
        IF COALESCE(v_profile.thanks_received, 0) >= v_badge.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
          v_awarded_badges := array_append(v_awarded_badges, v_badge.id);
        END IF;

      WHEN 'days_member' THEN
        IF v_days_member >= v_badge.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
          v_awarded_badges := array_append(v_awarded_badges, v_badge.id);
        END IF;

      WHEN 'verified' THEN
        IF v_profile.is_verified = true THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
          v_awarded_badges := array_append(v_awarded_badges, v_badge.id);
        END IF;

      WHEN 'early_adopter' THEN
        SELECT COUNT(*) INTO v_user_rank FROM profiles WHERE created_at <= v_profile.created_at;
        IF v_user_rank <= v_badge.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
          v_awarded_badges := array_append(v_awarded_badges, v_badge.id);
        END IF;

      ELSE
        -- Unknown requirement type, skip
        NULL;
    END CASE;
  END LOOP;

  RETURN json_build_object('success', true, 'awarded', v_awarded_badges);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user badges
CREATE OR REPLACE FUNCTION get_user_badges(p_user_id uuid)
RETURNS TABLE (
  badge_id text,
  name text,
  description text,
  icon text,
  color text,
  category text,
  awarded_at timestamptz
) AS $$
  SELECT 
    b.id as badge_id,
    COALESCE(b.name_es, b.name) as name,
    COALESCE(b.description_es, b.description) as description,
    b.icon,
    b.color,
    b.category,
    ub.awarded_at
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id = p_user_id
  ORDER BY b.display_order;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger to check badges after profile updates
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update_check_badges ON profiles;

CREATE TRIGGER on_profile_update_check_badges
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.posts_count IS DISTINCT FROM NEW.posts_count OR
    OLD.threads_count IS DISTINCT FROM NEW.threads_count OR
    OLD.thanks_received IS DISTINCT FROM NEW.thanks_received OR
    OLD.is_verified IS DISTINCT FROM NEW.is_verified
  )
  EXECUTE FUNCTION trigger_check_badges();

-- Also check on insert
CREATE TRIGGER on_profile_insert_check_badges
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();
