-- Mentions system for @username notifications

-- Table to store mentions
CREATE TABLE IF NOT EXISTS mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mentioner_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post ON mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_thread ON mentions(thread_id);
CREATE INDEX IF NOT EXISTS idx_mentions_unread ON mentions(mentioned_user_id, is_read) WHERE is_read = false;

-- RLS policies
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- Users can view their own mentions
CREATE POLICY "Users can view own mentions"
  ON mentions FOR SELECT
  USING (auth.uid() = mentioned_user_id);

-- Users can mark their mentions as read
CREATE POLICY "Users can update own mentions"
  ON mentions FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- System can insert mentions (via service role or trigger)
CREATE POLICY "Service can insert mentions"
  ON mentions FOR INSERT
  WITH CHECK (true);

-- Function to extract usernames from text and create mentions
CREATE OR REPLACE FUNCTION process_mentions(
  p_post_id uuid,
  p_thread_id uuid,
  p_content text,
  p_author_id uuid
) RETURNS void AS $$
DECLARE
  v_username text;
  v_user_id uuid;
  v_matches text[];
BEGIN
  -- Extract all @mentions using regex
  SELECT array_agg(DISTINCT match[1])
  INTO v_matches
  FROM regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g') AS match;
  
  IF v_matches IS NOT NULL THEN
    FOREACH v_username IN ARRAY v_matches
    LOOP
      -- Find user by username (case insensitive)
      SELECT id INTO v_user_id
      FROM profiles
      WHERE lower(username) = lower(v_username)
      AND id != p_author_id; -- Don't mention yourself
      
      IF v_user_id IS NOT NULL THEN
        -- Insert mention (ignore if duplicate)
        INSERT INTO mentions (post_id, mentioned_user_id, mentioner_user_id, thread_id)
        VALUES (p_post_id, v_user_id, p_author_id, p_thread_id)
        ON CONFLICT (post_id, mentioned_user_id) DO NOTHING;
        
        -- Create notification for the mentioned user
        INSERT INTO notifications (user_id, type, title, message, link, related_user_id)
        SELECT 
          v_user_id,
          'mention',
          'Te han mencionado',
          (SELECT username FROM profiles WHERE id = p_author_id) || ' te mencionó en un post',
          '/hilo/' || p_thread_id,
          p_author_id
        WHERE NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = v_user_id 
          AND type = 'mention' 
          AND link = '/hilo/' || p_thread_id
          AND created_at > now() - interval '1 hour'
        );
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process mentions when a post is created
CREATE OR REPLACE FUNCTION trigger_process_mentions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_mentions(NEW.id, NEW.thread_id, NEW.content, NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_process_mentions ON posts;

CREATE TRIGGER on_post_process_mentions
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_mentions();

-- Function to get unread mentions count
CREATE OR REPLACE FUNCTION get_unread_mentions_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM mentions
  WHERE mentioned_user_id = p_user_id
  AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to mark mentions as read
CREATE OR REPLACE FUNCTION mark_mentions_read(p_user_id uuid, p_thread_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_thread_id IS NOT NULL THEN
    UPDATE mentions
    SET is_read = true
    WHERE mentioned_user_id = p_user_id
    AND thread_id = p_thread_id
    AND is_read = false;
  ELSE
    UPDATE mentions
    SET is_read = true
    WHERE mentioned_user_id = p_user_id
    AND is_read = false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
