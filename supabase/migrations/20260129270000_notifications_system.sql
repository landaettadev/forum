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
      v_author_name || ' te mencionó',
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
      v_thanker_name || ' agradeció tu post',
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
  SELECT emoji INTO v_emoji FROM reaction_types WHERE id = NEW.reaction_type;

  IF v_post_author IS NOT NULL AND v_post_author != NEW.user_id THEN
    PERFORM create_notification(
      v_post_author,
      'reaction'::notification_type,
      v_reactor_name || ' reaccionó ' || v_emoji || ' a tu post',
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
