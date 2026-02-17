-- =====================================================
-- FIX: Follow system, Private Messages, RLS, and Notifications
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 0: Fix notifications table (missing entity_type)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'entity_type') THEN
    ALTER TABLE notifications ADD COLUMN entity_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'entity_id') THEN
    ALTER TABLE notifications ADD COLUMN entity_id uuid;
  END IF;
END $$;

-- Drop the old CHECK constraint that conflicts with the newer notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint with all notification types (including private_message)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'notifications' AND constraint_name = 'notifications_type_check_v2'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check_v2 
    CHECK (type IN (
      'reply', 'mention', 'quote', 'follow', 'like', 'message', 'private_message',
      'verification_approved', 'verification_rejected', 'suspension', 'warning', 'system',
      'thanks', 'reaction', 'new_badge', 'reputation', 'thread_reply'
    ));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PART 1: Fix user_follows table structure
-- =====================================================

-- Ensure user_follows table has the id column (without making it primary key if one exists)
DO $$
BEGIN
  -- Check if user_follows table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_follows' AND table_schema = 'public') THEN
    -- Check if id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_follows' AND column_name = 'id') THEN
      -- Add id column without PRIMARY KEY (table already has a primary key)
      ALTER TABLE user_follows ADD COLUMN id uuid DEFAULT gen_random_uuid() UNIQUE;
    END IF;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE user_follows (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      UNIQUE(follower_id, following_id)
    );
  END IF;
END $$;

-- Populate id column for existing rows if null
UPDATE user_follows SET id = gen_random_uuid() WHERE id IS NULL;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Enable RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Anyone can view follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage own follows" ON user_follows;

CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- =====================================================
-- PART 2: Fix toggle_user_follow function
-- =====================================================

DROP FUNCTION IF EXISTS toggle_user_follow(uuid);

CREATE OR REPLACE FUNCTION toggle_user_follow(p_following_id uuid)
RETURNS json AS $$
DECLARE
  v_follower_id uuid;
  v_existing_id uuid;
  v_is_following boolean;
BEGIN
  v_follower_id := auth.uid();
  
  IF v_follower_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF v_follower_id = p_following_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;
  
  -- Check if already following
  SELECT id INTO v_existing_id 
  FROM user_follows 
  WHERE follower_id = v_follower_id AND following_id = p_following_id;
  
  IF v_existing_id IS NOT NULL THEN
    -- Unfollow
    DELETE FROM user_follows WHERE follower_id = v_follower_id AND following_id = p_following_id;
    v_is_following := false;
  ELSE
    -- Follow
    INSERT INTO user_follows (follower_id, following_id) 
    VALUES (v_follower_id, p_following_id);
    v_is_following := true;
  END IF;
  
  RETURN json_build_object('success', true, 'following', v_is_following);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: Fix is_following_user function
-- =====================================================

DROP FUNCTION IF EXISTS is_following_user(uuid);

CREATE OR REPLACE FUNCTION is_following_user(p_following_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = auth.uid() AND following_id = p_following_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- PART 4: Fix private_messages RLS and structure
-- =====================================================

-- Ensure private_messages has all required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'conversation_id') THEN
    ALTER TABLE private_messages ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'sender_id') THEN
    ALTER TABLE private_messages ADD COLUMN sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'content') THEN
    ALTER TABLE private_messages ADD COLUMN content text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_messages' AND column_name = 'is_deleted') THEN
    ALTER TABLE private_messages ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;
END $$;

-- Note: RLS policies for private_messages are created in PART 7 to avoid recursion

-- =====================================================
-- PART 5: Fix send_private_message function
-- =====================================================

DROP FUNCTION IF EXISTS send_private_message(uuid, uuid, text);

CREATE OR REPLACE FUNCTION send_private_message(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_content text
) RETURNS json AS $$
DECLARE
  v_message_id uuid;
  v_is_participant boolean;
  v_auth_uid uuid;
BEGIN
  v_auth_uid := auth.uid();
  
  -- Verify the sender is the authenticated user
  IF v_auth_uid IS NULL OR v_auth_uid != p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if sender is participant
  SELECT EXISTS(
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id = p_sender_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Validate content
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;

  -- Insert message
  INSERT INTO private_messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, p_sender_id, trim(p_content))
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
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: Fix get_or_create_conversation function
-- =====================================================

DROP FUNCTION IF EXISTS get_or_create_conversation(uuid, uuid);

CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user_id uuid, p_other_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_conversation_id uuid;
  v_auth_uid uuid;
BEGIN
  v_auth_uid := auth.uid();
  
  -- Verify the user is authenticated and is the one creating
  IF v_auth_uid IS NULL OR v_auth_uid != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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

-- =====================================================
-- PART 7: Fix conversation_participants RLS (infinite recursion fix)
-- =====================================================

-- Drop ALL existing policies on conversation_participants to avoid recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their conversations participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view own participations" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_policy" ON conversation_participants;

-- Create simple non-recursive policy: users can see their own participations
CREATE POLICY "Users can view own participations"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Drop ALL existing policies on conversations to avoid recursion
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON conversations;

-- Create helper function to check conversation access (SECURITY DEFINER avoids RLS)
CREATE OR REPLACE FUNCTION user_has_conversation_access(p_conversation_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create simple policy for conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (user_has_conversation_access(id));

-- Fix private_messages policies to use the helper function
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON private_messages;
DROP POLICY IF EXISTS "Users can send messages" ON private_messages;

CREATE POLICY "Users can view messages in their conversations"
  ON private_messages FOR SELECT
  USING (user_has_conversation_access(conversation_id));

CREATE POLICY "Users can send messages"
  ON private_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    user_has_conversation_access(conversation_id)
  );

-- =====================================================
-- PART 8: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION toggle_user_follow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_following_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_private_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_conversation_access(uuid) TO authenticated;

-- =====================================================
-- Done! All issues should be fixed now.
-- =====================================================
