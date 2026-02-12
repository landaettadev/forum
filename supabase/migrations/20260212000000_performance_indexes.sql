-- =============================================
-- Performance Indexes for scaling
-- =============================================
-- These indexes optimize the most common queries as the forum grows,
-- especially for city/region lookups, thread listings, and search.

-- Threads: common listing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_forum_last_post
  ON threads (forum_id, last_post_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_forum_pinned_last
  ON threads (forum_id, is_pinned DESC, last_post_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_author
  ON threads (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_created
  ON threads (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_views
  ON threads (views_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_region
  ON threads (region_id);

-- Posts: thread-level listing + author lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_thread_created
  ON posts (thread_id, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author
  ON posts (author_id);

-- Profiles: common lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username
  ON profiles (username);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_last_seen
  ON profiles (last_seen_at DESC)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_posts_count
  ON profiles (posts_count DESC)
  WHERE is_deleted = false;

-- Regions & Countries: geographic lookups (critical for city-heavy tables)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regions_country
  ON regions (country_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regions_name
  ON regions (name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_countries_continent
  ON countries (continent);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_countries_code
  ON countries (code);

-- Forums: category grouping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forums_category
  ON forums (category_id, display_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forums_slug
  ON forums (slug);

-- Post thanks: toggle check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_thanks_user_post
  ON post_thanks (user_id, post_id);

-- Notifications: user inbox
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read, created_at DESC);

-- Search history: popular searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_history_created
  ON search_history (created_at DESC);

-- Shop purchases: active items per user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shop_purchases_user_active
  ON shop_purchases (user_id, expires_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- Bookmarks: user lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_bookmarks_user
  ON post_bookmarks (user_id, created_at DESC);

-- Reports: unresolved queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_status
  ON reports (status, created_at DESC);

-- =============================================
-- Optimize get_forum_stats RPC
-- =============================================
-- Replace the sequential COUNT(*) with pre-computed stats when possible.
-- For now, add partial indexes to speed up the counts.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_active
  ON profiles (id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_active
  ON threads (id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active
  ON posts (id)
  WHERE is_deleted = false;

-- Text search: enable pg_trgm for ILIKE queries if not already enabled
-- (Requires superuser — run manually in Supabase SQL Editor if this fails)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for text search (uncomment after enabling pg_trgm)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_title_trgm
--   ON threads USING gin (title gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_trgm
--   ON posts USING gin (content gin_trgm_ops);
