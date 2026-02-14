-- =============================================
-- Enable pg_trgm extension and GIN indexes for text search
-- =============================================
-- These indexes dramatically speed up ILIKE queries on large tables.
-- Without them, search is O(n) sequential scan.
--
-- NOTE: pg_trgm is available on Supabase by default (no superuser needed).
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for thread title search (used by searchThreads + getSearchSuggestions)
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm
  ON threads USING gin (title gin_trgm_ops);

-- GIN index for post content search (used by searchPosts)
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
  ON posts USING gin (content gin_trgm_ops);

-- GIN index for username search (used by searchUsers + mention autocomplete)
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON profiles USING gin (username gin_trgm_ops);
