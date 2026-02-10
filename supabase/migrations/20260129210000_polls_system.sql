-- Polls/Surveys system for threads

-- Table for polls
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  question text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  allow_multiple boolean DEFAULT false,
  show_results_before_vote boolean DEFAULT false,
  ends_at timestamptz,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table for poll options
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table for poll votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_polls_thread ON polls(thread_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);

-- RLS policies
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view polls
CREATE POLICY "Anyone can view polls"
  ON polls FOR SELECT USING (true);

CREATE POLICY "Anyone can view poll options"
  ON poll_options FOR SELECT USING (true);

-- Only creator or admin can create polls
CREATE POLICY "Thread authors can create polls"
  ON polls FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Poll creators can add options"
  ON poll_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      WHERE id = poll_id AND created_by = auth.uid()
    )
  );

-- Users can vote if poll is not closed
CREATE POLICY "Users can vote on open polls"
  ON poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM polls
      WHERE id = poll_id AND (is_closed = true OR (ends_at IS NOT NULL AND ends_at < now()))
    )
  );

-- Users can see their own votes
CREATE POLICY "Users can view votes"
  ON poll_votes FOR SELECT
  USING (true);

-- Users can delete their own votes
CREATE POLICY "Users can remove their votes"
  ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get poll with vote counts
CREATE OR REPLACE FUNCTION get_poll_with_results(p_thread_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  poll_id uuid,
  question text,
  allow_multiple boolean,
  show_results_before_vote boolean,
  ends_at timestamptz,
  is_closed boolean,
  total_votes bigint,
  user_has_voted boolean,
  options json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as poll_id,
    p.question,
    p.allow_multiple,
    p.show_results_before_vote,
    p.ends_at,
    p.is_closed,
    COALESCE((SELECT COUNT(DISTINCT pv.user_id) FROM poll_votes pv WHERE pv.poll_id = p.id), 0) as total_votes,
    CASE WHEN p_user_id IS NOT NULL THEN
      EXISTS(SELECT 1 FROM poll_votes pv WHERE pv.poll_id = p.id AND pv.user_id = p_user_id)
    ELSE false END as user_has_voted,
    (
      SELECT json_agg(
        json_build_object(
          'id', po.id,
          'text', po.option_text,
          'votes', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id),
          'user_voted', CASE WHEN p_user_id IS NOT NULL THEN
            EXISTS(SELECT 1 FROM poll_votes pv WHERE pv.option_id = po.id AND pv.user_id = p_user_id)
          ELSE false END
        ) ORDER BY po.display_order
      )
      FROM poll_options po
      WHERE po.poll_id = p.id
    ) as options
  FROM polls p
  WHERE p.thread_id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on a poll
CREATE OR REPLACE FUNCTION vote_on_poll(
  p_poll_id uuid,
  p_option_ids uuid[],
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_poll polls%ROWTYPE;
  v_option_id uuid;
BEGIN
  -- Get poll info
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Poll not found');
  END IF;
  
  -- Check if poll is closed
  IF v_poll.is_closed OR (v_poll.ends_at IS NOT NULL AND v_poll.ends_at < now()) THEN
    RETURN json_build_object('success', false, 'error', 'Poll is closed');
  END IF;
  
  -- Check if multiple votes allowed
  IF NOT v_poll.allow_multiple AND array_length(p_option_ids, 1) > 1 THEN
    RETURN json_build_object('success', false, 'error', 'Multiple votes not allowed');
  END IF;
  
  -- Remove existing votes if not allow_multiple
  IF NOT v_poll.allow_multiple THEN
    DELETE FROM poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id;
  END IF;
  
  -- Add votes
  FOREACH v_option_id IN ARRAY p_option_ids
  LOOP
    INSERT INTO poll_votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, v_option_id, p_user_id)
    ON CONFLICT (poll_id, option_id, user_id) DO NOTHING;
  END LOOP;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a poll
CREATE OR REPLACE FUNCTION create_poll(
  p_thread_id uuid,
  p_question text,
  p_options text[],
  p_user_id uuid,
  p_allow_multiple boolean DEFAULT false,
  p_show_results_before_vote boolean DEFAULT false,
  p_ends_at timestamptz DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_poll_id uuid;
  v_option text;
  v_order integer := 0;
BEGIN
  -- Check if thread already has a poll
  IF EXISTS (SELECT 1 FROM polls WHERE thread_id = p_thread_id) THEN
    RETURN json_build_object('success', false, 'error', 'Thread already has a poll');
  END IF;
  
  -- Create poll
  INSERT INTO polls (thread_id, question, created_by, allow_multiple, show_results_before_vote, ends_at)
  VALUES (p_thread_id, p_question, p_user_id, p_allow_multiple, p_show_results_before_vote, p_ends_at)
  RETURNING id INTO v_poll_id;
  
  -- Add options
  FOREACH v_option IN ARRAY p_options
  LOOP
    INSERT INTO poll_options (poll_id, option_text, display_order)
    VALUES (v_poll_id, v_option, v_order);
    v_order := v_order + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'poll_id', v_poll_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
