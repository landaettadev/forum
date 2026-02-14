-- =============================================
-- ADD SEO-FRIENDLY SLUGS TO THREADS
-- =============================================

-- 1. Add slug column (nullable first so we can backfill)
ALTER TABLE threads ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Helper function to generate a slug from a title
CREATE OR REPLACE FUNCTION generate_thread_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
BEGIN
  -- Lowercase, replace accented chars, keep only alphanumeric + spaces, then hyphenate
  base_slug := lower(title);
  -- Remove accents
  base_slug := translate(base_slug,
    'áàâãäéèêëíìîïóòôõöúùûüñç',
    'aaaaaeeeeiiiioooooouuuunc');
  -- Replace non-alphanumeric (except spaces/hyphens) with empty
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s\-]', '', 'g');
  -- Collapse whitespace/hyphens into single hyphen
  base_slug := regexp_replace(trim(base_slug), '[\s\-]+', '-', 'g');
  -- Truncate to 80 chars at a word boundary
  IF length(base_slug) > 80 THEN
    base_slug := substring(base_slug FROM 1 FOR 80);
    -- Remove trailing partial word
    base_slug := regexp_replace(base_slug, '-[^-]*$', '');
  END IF;
  RETURN base_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Backfill slugs for all existing threads
-- Append short ID suffix to guarantee uniqueness
UPDATE threads
SET slug = generate_thread_slug(title) || '-' || substring(id::text FROM 1 FOR 8)
WHERE slug IS NULL;

-- 4. Make slug NOT NULL and add index
ALTER TABLE threads ALTER COLUMN slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_slug ON threads(slug);

-- 5. Add region_id column if not exists (for SEO URL routing)
ALTER TABLE threads ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

-- 6. Backfill region_id from forum's country/region mapping where possible
-- This is a best-effort backfill; new threads will set region_id at creation time
