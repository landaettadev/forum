-- Login sessions table to track user login history with IP addresses
CREATE TABLE IF NOT EXISTS login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  country_code text,
  country_name text,
  city text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_created_at ON login_sessions(created_at DESC);

-- RLS: Only admins can read login sessions
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read login sessions"
  ON login_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'mod')
    )
  );

CREATE POLICY "System can insert login sessions"
  ON login_sessions FOR INSERT
  WITH CHECK (true);
