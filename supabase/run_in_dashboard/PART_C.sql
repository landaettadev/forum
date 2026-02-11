-- =============================================
-- FILE: 20260129230000_auto_badges_system.sql
-- =============================================
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
  ('first_post', 'Primer Post', 'Primer Post', 'First Post', 'Publicaste tu primer post', 'Publicaste tu primer post', 'You published your first post', 'âœï¸', '#10b981', 'milestone', 'posts', 1, 1),
  ('active_poster', 'Activo', 'Activo', 'Active Poster', '10 posts publicados', '10 posts publicados', '10 posts published', 'ðŸ’¬', '#3b82f6', 'milestone', 'posts', 10, 2),
  ('prolific_writer', 'Escritor ProlÃ­fico', 'Escritor ProlÃ­fico', 'Prolific Writer', '50 posts publicados', '50 posts publicados', '50 posts published', 'ðŸ“', '#8b5cf6', 'milestone', 'posts', 50, 3),
  ('forum_veteran', 'Veterano', 'Veterano', 'Forum Veteran', '100 posts publicados', '100 posts publicados', '100 posts published', 'ðŸ†', '#f59e0b', 'milestone', 'posts', 100, 4),
  ('legend', 'Leyenda', 'Leyenda', 'Legend', '500 posts publicados', '500 posts publicados', '500 posts published', 'ðŸ‘‘', '#ef4444', 'milestone', 'posts', 500, 5),

  -- Thread milestones
  ('thread_starter', 'Iniciador', 'Iniciador', 'Thread Starter', 'Creaste tu primer hilo', 'Creaste tu primer hilo', 'You created your first thread', 'ðŸ§µ', '#06b6d4', 'milestone', 'threads', 1, 10),
  ('conversation_maker', 'Conversador', 'Conversador', 'Conversation Maker', '5 hilos creados', '5 hilos creados', '5 threads created', 'ðŸ’¡', '#14b8a6', 'milestone', 'threads', 5, 11),
  ('topic_master', 'Maestro de Temas', 'Maestro de Temas', 'Topic Master', '25 hilos creados', '25 hilos creados', '25 threads created', 'ðŸŽ¯', '#f97316', 'milestone', 'threads', 25, 12),

  -- Thanks/appreciation
  ('appreciated', 'Apreciado', 'Apreciado', 'Appreciated', 'Recibiste 10 agradecimientos', 'Recibiste 10 agradecimientos', 'Received 10 thanks', 'ðŸ™', '#ec4899', 'achievement', 'thanks', 10, 20),
  ('helpful', 'Ãštil', 'Ãštil', 'Helpful', 'Recibiste 50 agradecimientos', 'Recibiste 50 agradecimientos', 'Received 50 thanks', 'ðŸ¤', '#d946ef', 'achievement', 'thanks', 50, 21),
  ('community_helper', 'Ayudante', 'Ayudante de la Comunidad', 'Community Helper', 'Recibiste 100 agradecimientos', 'Recibiste 100 agradecimientos', 'Received 100 thanks', 'â­', '#a855f7', 'achievement', 'thanks', 100, 22),

  -- Time-based
  ('newcomer', 'Novato', 'Novato', 'Newcomer', 'Te uniste al foro', 'Te uniste al foro', 'You joined the forum', 'ðŸŒ±', '#22c55e', 'milestone', 'days_member', 0, 30),
  ('regular', 'Regular', 'Regular', 'Regular', '30 dÃ­as como miembro', '30 dÃ­as como miembro', '30 days as member', 'ðŸ“…', '#0ea5e9', 'milestone', 'days_member', 30, 31),
  ('established', 'Establecido', 'Establecido', 'Established', '90 dÃ­as como miembro', '90 dÃ­as como miembro', '90 days as member', 'ðŸ ', '#6366f1', 'milestone', 'days_member', 90, 32),
  ('oldtimer', 'Veterano', 'Antiguo', 'Old Timer', '365 dÃ­as como miembro', '365 dÃ­as como miembro', '365 days as member', 'ðŸŽ–ï¸', '#eab308', 'milestone', 'days_member', 365, 33),

  -- Special
  ('verified_user', 'Verificado', 'Verificado', 'Verified', 'Usuario verificado', 'Usuario verificado', 'Verified user', 'âœ“', '#22c55e', 'special', 'verified', 1, 40),
  ('early_adopter', 'Early Adopter', 'Pionero', 'Early Adopter', 'Entre los primeros 100 usuarios', 'Entre los primeros 100 usuarios', 'Among the first 100 users', 'ðŸš€', '#f43f5e', 'special', 'early_adopter', 100, 41)
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


-- =============================================
-- FILE: 20260129240000_private_messages.sql
-- =============================================
-- Private messaging system

-- Conversations table (for 1:1 or group chats)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  is_group boolean DEFAULT false,
  group_name text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_muted boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Handle existing private_messages table or create new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'private_messages' AND table_schema = 'public') THEN
    -- Add missing columns to existing table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'conversation_id') THEN
      ALTER TABLE private_messages ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'sender_id') THEN
      ALTER TABLE private_messages ADD COLUMN sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'content') THEN
      ALTER TABLE private_messages ADD COLUMN content text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'edited_at') THEN
      ALTER TABLE private_messages ADD COLUMN edited_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'is_deleted') THEN
      ALTER TABLE private_messages ADD COLUMN is_deleted boolean DEFAULT false;
    END IF;
  ELSE
    CREATE TABLE private_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
      sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
      content text NOT NULL,
      created_at timestamptz DEFAULT now(),
      edited_at timestamptz,
      is_deleted boolean DEFAULT false
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- Create indexes on private_messages columns if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_private_messages_conv ON private_messages(conversation_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'sender_id') THEN
    CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_private_messages_created ON private_messages(created_at DESC);
  END IF;
END $$;

-- RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON private_messages;
DROP POLICY IF EXISTS "Users can send messages" ON private_messages;

-- Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = id AND user_id = auth.uid()
  ));

-- Users can view participants of their conversations
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  ));

-- Users can update their own participant settings
CREATE POLICY "Users can update their participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON private_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = private_messages.conversation_id AND user_id = auth.uid()
  ));

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
  ON private_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = private_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Function to start or get existing conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user_id uuid, p_other_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Find existing 1:1 conversation between these users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = p_user_id)
  AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = p_other_user_id)
  AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;

  -- Create new conversation if none exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (is_group, created_by)
    VALUES (false, p_user_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
      (v_conversation_id, p_user_id),
      (v_conversation_id, p_other_user_id);
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_private_message(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_content text
) RETURNS json AS $$
DECLARE
  v_message_id uuid;
  v_is_participant boolean;
BEGIN
  -- Check if sender is participant
  SELECT EXISTS(
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id = p_sender_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Insert message
  INSERT INTO private_messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, p_sender_id, p_content)
  RETURNING id INTO v_message_id;

  -- Update conversation timestamp
  UPDATE conversations 
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;

  -- Update sender's last_read_at
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_sender_id;

  RETURN json_build_object('success', true, 'message_id', v_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's conversations with preview
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  is_group boolean,
  group_name text,
  last_message_at timestamptz,
  is_muted boolean,
  is_archived boolean,
  unread_count bigint,
  last_message_content text,
  last_message_sender_id uuid,
  other_user_id uuid,
  other_user_username text,
  other_user_avatar text
) AS $$
  SELECT 
    c.id as conversation_id,
    c.is_group,
    c.group_name,
    c.last_message_at,
    cp.is_muted,
    cp.is_archived,
    (
      SELECT COUNT(*) FROM private_messages pm 
      WHERE pm.conversation_id = c.id 
      AND pm.created_at > cp.last_read_at
      AND pm.sender_id != p_user_id
    ) as unread_count,
    (
      SELECT content FROM private_messages pm 
      WHERE pm.conversation_id = c.id 
      ORDER BY pm.created_at DESC LIMIT 1
    ) as last_message_content,
    (
      SELECT sender_id FROM private_messages pm 
      WHERE pm.conversation_id = c.id 
      ORDER BY pm.created_at DESC LIMIT 1
    ) as last_message_sender_id,
    -- For 1:1 chats, get the other user's info
    CASE WHEN NOT c.is_group THEN (
      SELECT cp2.user_id FROM conversation_participants cp2 
      WHERE cp2.conversation_id = c.id AND cp2.user_id != p_user_id LIMIT 1
    ) END as other_user_id,
    CASE WHEN NOT c.is_group THEN (
      SELECT p.username FROM conversation_participants cp2 
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id AND cp2.user_id != p_user_id LIMIT 1
    ) END as other_user_username,
    CASE WHEN NOT c.is_group THEN (
      SELECT p.avatar_url FROM conversation_participants cp2 
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id AND cp2.user_id != p_user_id LIMIT 1
    ) END as other_user_avatar
  FROM conversations c
  JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = p_user_id
  WHERE NOT cp.is_archived
  ORDER BY c.last_message_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void AS $$
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get unread messages count
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id uuid)
RETURNS bigint AS $$
  SELECT COALESCE(SUM(
    (SELECT COUNT(*) FROM private_messages pm 
     WHERE pm.conversation_id = cp.conversation_id 
     AND pm.created_at > cp.last_read_at
     AND pm.sender_id != p_user_id)
  ), 0)
  FROM conversation_participants cp
  WHERE cp.user_id = p_user_id AND NOT cp.is_archived;
$$ LANGUAGE sql SECURITY DEFINER;


-- =============================================
-- FILE: 20260129250000_online_status.sql
-- =============================================
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


-- =============================================
-- FILE: 20260129260000_reputation_system.sql
-- =============================================
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
      'RecibiÃ³ un agradecimiento',
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
      'RecibiÃ³ una reacciÃ³n',
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


-- =============================================
-- FILE: 20260129270000_notifications_system.sql
-- =============================================
-- Notifications system

-- Notification types enum (skip if exists)
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'mention', 'reply', 'quote', 'thanks', 'reaction',
    'new_badge', 'reputation', 'private_message', 'thread_reply', 'follow'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
  ON notifications FOR INSERT 
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Don't notify user about their own actions
  IF p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, link, actor_id, entity_type, entity_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_actor_id, p_entity_type, p_entity_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_unread_only boolean DEFAULT false
) RETURNS TABLE (
  id uuid,
  type notification_type,
  title text,
  message text,
  link text,
  is_read boolean,
  actor_id uuid,
  actor_username text,
  actor_avatar text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.link,
    n.is_read,
    n.actor_id,
    p.username as actor_username,
    p.avatar_url as actor_avatar,
    n.entity_type,
    n.entity_id,
    n.created_at
  FROM notifications n
  LEFT JOIN profiles p ON n.actor_id = p.id
  WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE user_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id uuid)
RETURNS bigint AS $$
  SELECT COUNT(*) FROM notifications 
  WHERE user_id = p_user_id AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger for mention notifications (update existing)
CREATE OR REPLACE FUNCTION notify_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_user record;
  v_author_name text;
  v_thread_title text;
BEGIN
  -- Get author name
  SELECT username INTO v_author_name FROM profiles WHERE id = NEW.author_id;
  
  -- Get thread title
  SELECT title INTO v_thread_title FROM threads WHERE id = NEW.thread_id;

  -- Find and notify mentioned users
  FOR v_mentioned_user IN 
    SELECT DISTINCT p.id, p.username
    FROM profiles p
    WHERE NEW.content ~* ('@' || p.username || '\b')
      AND p.id != NEW.author_id
  LOOP
    PERFORM create_notification(
      v_mentioned_user.id,
      'mention'::notification_type,
      v_author_name || ' te mencionÃ³',
      'En: ' || v_thread_title,
      '/hilo/' || NEW.thread_id,
      NEW.author_id,
      'post',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_mention ON posts;
CREATE TRIGGER on_post_mention
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_mention();

-- Trigger for thanks notifications
CREATE OR REPLACE FUNCTION notify_on_thanks()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author uuid;
  v_thanker_name text;
  v_thread_id uuid;
BEGIN
  SELECT author_id, thread_id INTO v_post_author, v_thread_id 
  FROM posts WHERE id = NEW.post_id;
  
  SELECT username INTO v_thanker_name FROM profiles WHERE id = NEW.user_id;

  IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
    PERFORM create_notification(
      v_post_author,
      'thanks'::notification_type,
      v_thanker_name || ' agradeciÃ³ tu post',
      NULL,
      '/hilo/' || v_thread_id,
      NEW.user_id,
      'post',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_thanks_notify ON post_thanks;
CREATE TRIGGER on_thanks_notify
  AFTER INSERT ON post_thanks
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_thanks();

-- Trigger for reaction notifications
CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author uuid;
  v_reactor_name text;
  v_thread_id uuid;
  v_emoji text;
BEGIN
  SELECT author_id, thread_id INTO v_post_author, v_thread_id 
  FROM posts WHERE id = NEW.post_id;
  
  SELECT username INTO v_reactor_name FROM profiles WHERE id = NEW.user_id;
  SELECT emoji INTO v_emoji FROM reaction_types WHERE id = NEW.reaction_type_id;

  IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
    PERFORM create_notification(
      v_post_author,
      'reaction'::notification_type,
      v_reactor_name || ' reaccionÃ³ ' || v_emoji || ' a tu post',
      NULL,
      '/hilo/' || v_thread_id,
      NEW.user_id,
      'post',
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reaction_notify ON post_reactions;
CREATE TRIGGER on_reaction_notify
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_reaction();

-- Trigger for private message notifications
CREATE OR REPLACE FUNCTION notify_on_private_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name text;
  v_recipient record;
BEGIN
  SELECT username INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  FOR v_recipient IN 
    SELECT user_id FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    PERFORM create_notification(
      v_recipient.user_id,
      'private_message'::notification_type,
      'Nuevo mensaje de ' || v_sender_name,
      LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
      '/mensajes',
      NEW.sender_id,
      'message',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pm_notify ON private_messages;
CREATE TRIGGER on_pm_notify
  AFTER INSERT ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_private_message();


-- =============================================
-- FILE: 20260129280000_thread_subscriptions.sql
-- =============================================
-- Thread subscriptions system

-- Thread subscriptions table
CREATE TABLE IF NOT EXISTS thread_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  notify_on_reply boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_thread_subs_user ON thread_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_subs_thread ON thread_subscriptions(thread_id);

-- RLS
ALTER TABLE thread_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" 
  ON thread_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" 
  ON thread_subscriptions FOR ALL 
  USING (auth.uid() = user_id);

-- Function to toggle subscription
CREATE OR REPLACE FUNCTION toggle_thread_subscription(
  p_thread_id uuid,
  p_user_id uuid,
  p_notify boolean DEFAULT true
) RETURNS json AS $$
DECLARE
  v_existing uuid;
  v_subscribed boolean;
BEGIN
  SELECT id INTO v_existing 
  FROM thread_subscriptions 
  WHERE thread_id = p_thread_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM thread_subscriptions WHERE id = v_existing;
    v_subscribed := false;
  ELSE
    INSERT INTO thread_subscriptions (thread_id, user_id, notify_on_reply)
    VALUES (p_thread_id, p_user_id, p_notify);
    v_subscribed := true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'subscribed', v_subscribed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if subscribed
CREATE OR REPLACE FUNCTION is_subscribed_to_thread(p_thread_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM thread_subscriptions 
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get user's subscribed threads
CREATE OR REPLACE FUNCTION get_subscribed_threads(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  thread_id uuid,
  thread_title text,
  thread_slug text,
  forum_id uuid,
  forum_name text,
  last_post_at timestamptz,
  reply_count bigint,
  subscribed_at timestamptz
) AS $$
  SELECT 
    t.id as thread_id,
    t.title as thread_title,
    t.slug as thread_slug,
    t.forum_id,
    f.name as forum_name,
    t.last_post_at,
    t.reply_count,
    ts.created_at as subscribed_at
  FROM thread_subscriptions ts
  JOIN threads t ON ts.thread_id = t.id
  JOIN forums f ON t.forum_id = f.id
  WHERE ts.user_id = p_user_id
  ORDER BY t.last_post_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger to notify subscribers on new post
CREATE OR REPLACE FUNCTION notify_thread_subscribers()
RETURNS TRIGGER AS $$
DECLARE
  v_subscriber record;
  v_author_name text;
  v_thread_title text;
BEGIN
  -- Get author and thread info
  SELECT username INTO v_author_name FROM profiles WHERE id = NEW.author_id;
  SELECT title INTO v_thread_title FROM threads WHERE id = NEW.thread_id;

  -- Notify all subscribers except the post author
  FOR v_subscriber IN 
    SELECT user_id FROM thread_subscriptions 
    WHERE thread_id = NEW.thread_id 
      AND user_id != NEW.author_id
      AND notify_on_reply = true
  LOOP
    PERFORM create_notification(
      v_subscriber.user_id,
      'thread_reply'::notification_type,
      'Nueva respuesta en ' || LEFT(v_thread_title, 30),
      v_author_name || ' respondiÃ³',
      '/hilo/' || NEW.thread_id,
      NEW.author_id,
      'post',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_notify_subscribers ON posts;
CREATE TRIGGER on_post_notify_subscribers
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_thread_subscribers();

-- Auto-subscribe thread creator
CREATE OR REPLACE FUNCTION auto_subscribe_thread_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO thread_subscriptions (user_id, thread_id, notify_on_reply)
  VALUES (NEW.author_id, NEW.id, true)
  ON CONFLICT (user_id, thread_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_thread_auto_subscribe ON threads;
CREATE TRIGGER on_thread_auto_subscribe
  AFTER INSERT ON threads
  FOR EACH ROW
  EXECUTE FUNCTION auto_subscribe_thread_creator();



