-- Generic atomic counter increment function
-- Avoids race conditions from read-then-write patterns
-- SECURITY: Whitelist of allowed table/column pairs to prevent abuse
CREATE OR REPLACE FUNCTION increment_counter(
  table_name TEXT,
  column_name TEXT,
  row_id UUID,
  amount INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Whitelist: only allow known counter columns to be incremented
  IF NOT (
    (table_name = 'profiles' AND column_name IN ('posts_count', 'threads_count', 'thanks_received', 'likes_received'))
    OR (table_name = 'threads' AND column_name IN ('replies_count', 'views_count'))
    OR (table_name = 'posts' AND column_name IN ('thanks_count'))
    OR (table_name = 'forums' AND column_name IN ('threads_count', 'posts_count'))
  ) THEN
    RAISE EXCEPTION 'increment_counter: disallowed table/column pair: %.%', table_name, column_name;
  END IF;

  EXECUTE format(
    'UPDATE %I SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2',
    table_name, column_name, column_name
  ) USING amount, row_id;
END;
$$;
