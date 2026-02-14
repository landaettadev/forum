-- Enable pg_trgm extension for fast ILIKE/similarity queries
-- In Supabase, pg_trgm is available and can be enabled without superuser
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for text search on threads and posts
-- These dramatically speed up ILIKE '%query%' searches on large tables
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm
  ON threads USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
  ON posts USING gin (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON profiles USING gin (username gin_trgm_ops);
