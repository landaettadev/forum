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
      v_author_name || ' respondió',
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
