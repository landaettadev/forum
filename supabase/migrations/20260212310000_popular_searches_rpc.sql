-- =============================================
-- RPC: Get popular searches aggregated in SQL
-- Replaces the JS-side frequency counting that downloaded all rows
-- =============================================

-- Create search_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Search history is insertable by authenticated"
  ON search_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_popular_searches(
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(query TEXT, search_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    sh.query,
    COUNT(*) AS search_count
  FROM search_history sh
  WHERE sh.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY sh.query
  ORDER BY search_count DESC
  LIMIT p_limit;
$$;
