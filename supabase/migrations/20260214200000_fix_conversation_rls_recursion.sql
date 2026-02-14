-- Fix infinite recursion in conversation_participants RLS policy
-- The SELECT policy on conversation_participants was referencing itself,
-- causing: "infinite recursion detected in policy for relation conversation_participants"

-- Step 1: Create a SECURITY DEFINER helper that checks if the current user
-- is a participant in a given conversation. Because it runs as the definer,
-- it bypasses RLS and breaks the recursion cycle.
CREATE OR REPLACE FUNCTION public.auth_is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

-- Step 2: Drop the broken policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON private_messages;
DROP POLICY IF EXISTS "Users can send messages" ON private_messages;

-- Step 3: Recreate policies using the helper function (no recursion)

-- Conversations: users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (public.auth_is_conversation_participant(id));

-- Conversation participants: users can see all participants in their conversations
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (public.auth_is_conversation_participant(conversation_id));

-- Conversation participants: users can update their own settings (mute, archive, etc.)
CREATE POLICY "Users can update their participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Private messages: users can read messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON private_messages FOR SELECT
  USING (public.auth_is_conversation_participant(conversation_id));

-- Private messages: users can send messages to conversations they belong to
CREATE POLICY "Users can send messages"
  ON private_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.auth_is_conversation_participant(conversation_id)
  );
