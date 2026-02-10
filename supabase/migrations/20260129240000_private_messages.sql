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
