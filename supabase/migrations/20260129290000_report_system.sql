-- Report system for posts, threads, and users

-- Report status enum
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- Report reason enum
CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'inappropriate',
  'off_topic',
  'duplicate',
  'misinformation',
  'illegal',
  'other'
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason report_reason NOT NULL,
  description text,
  status report_status DEFAULT 'pending',
  -- Target can be post, thread, or user
  target_type text NOT NULL CHECK (target_type IN ('post', 'thread', 'user', 'message')),
  target_id uuid NOT NULL,
  -- Moderation
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes text,
  action_taken text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" 
  ON reports FOR SELECT 
  USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports" 
  ON reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

-- Moderators can view all reports (requires role check in app)
CREATE POLICY "Moderators can view all reports" 
  ON reports FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'moderator')
    )
  );

-- Moderators can update reports
CREATE POLICY "Moderators can update reports" 
  ON reports FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'moderator')
    )
  );

-- Function to create a report
CREATE OR REPLACE FUNCTION create_report(
  p_target_type text,
  p_target_id uuid,
  p_reason report_reason,
  p_description text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_reporter_id uuid;
  v_existing uuid;
  v_report_id uuid;
BEGIN
  v_reporter_id := auth.uid();
  
  IF v_reporter_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check for existing report from same user on same target
  SELECT id INTO v_existing 
  FROM reports 
  WHERE reporter_id = v_reporter_id 
    AND target_type = p_target_type 
    AND target_id = p_target_id
    AND status IN ('pending', 'reviewing');

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already reported');
  END IF;

  INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
  VALUES (v_reporter_id, p_target_type, p_target_id, p_reason, p_description)
  RETURNING id INTO v_report_id;

  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reports count (for moderators)
CREATE OR REPLACE FUNCTION get_pending_reports_count()
RETURNS bigint AS $$
  SELECT COUNT(*) FROM reports WHERE status = 'pending';
$$ LANGUAGE sql SECURITY DEFINER;

-- Function for moderators to update report status
CREATE OR REPLACE FUNCTION update_report_status(
  p_report_id uuid,
  p_status report_status,
  p_notes text DEFAULT NULL,
  p_action text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_moderator_id uuid;
BEGIN
  v_moderator_id := auth.uid();
  
  -- Check if user is moderator
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_moderator_id 
    AND (role = 'admin' OR role = 'moderator')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE reports SET
    status = p_status,
    moderator_id = v_moderator_id,
    moderator_notes = COALESCE(p_notes, moderator_notes),
    action_taken = p_action,
    resolved_at = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_report_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reports for moderation
CREATE OR REPLACE FUNCTION get_reports_for_moderation(
  p_status report_status DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  reporter_username text,
  reason report_reason,
  description text,
  status report_status,
  target_type text,
  target_id uuid,
  created_at timestamptz,
  moderator_username text
) AS $$
BEGIN
  -- Check if user is moderator
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (role = 'admin' OR role = 'moderator')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.reporter_id,
    p.username as reporter_username,
    r.reason,
    r.description,
    r.status,
    r.target_type,
    r.target_id,
    r.created_at,
    m.username as moderator_username
  FROM reports r
  LEFT JOIN profiles p ON r.reporter_id = p.id
  LEFT JOIN profiles m ON r.moderator_id = m.id
  WHERE (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
