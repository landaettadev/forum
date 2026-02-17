-- =====================================================
-- AUTOPROMOCIÓN SYSTEM
-- Adds is_escort_only flag to forums and creates
-- autopromoción forums per country automatically.
-- =====================================================

-- Add escort-only flag to forums
ALTER TABLE forums ADD COLUMN IF NOT EXISTS is_escort_only BOOLEAN DEFAULT FALSE;

-- Add country_id FK to forums (existing country_code is ISO text, we need UUID)
ALTER TABLE forums ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_forums_escort_only ON forums(is_escort_only) WHERE is_escort_only = TRUE;
CREATE INDEX IF NOT EXISTS idx_forums_country_id ON forums(country_id);

-- Function: auto-create autopromoción forum for a country
CREATE OR REPLACE FUNCTION create_autopromo_forum(p_country_id UUID)
RETURNS UUID AS $$
DECLARE
  v_country RECORD;
  v_forum_id UUID;
BEGIN
  SELECT id, name, name_es, slug, iso_code INTO v_country
  FROM countries WHERE id = p_country_id;

  IF v_country IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if autopromo forum already exists for this country
  SELECT id INTO v_forum_id FROM forums
  WHERE country_id = p_country_id AND is_escort_only = TRUE
  LIMIT 1;

  IF v_forum_id IS NOT NULL THEN
    RETURN v_forum_id;
  END IF;

  -- Create the autopromo forum
  INSERT INTO forums (
    name, slug, description, country_code, country_id,
    is_escort_only, is_private, display_order
  ) VALUES (
    'Autopromoción ' || COALESCE(v_country.name_es, v_country.name),
    'autopromocion-' || v_country.slug,
    'Sección de autopromoción para escorts verificadas en ' || COALESCE(v_country.name_es, v_country.name) || '. Solo escorts verificadas pueden crear hilos.',
    v_country.iso_code,
    v_country.id,
    TRUE,
    FALSE, -- public to view
    -1     -- display_order -1 = appears first
  )
  RETURNING id INTO v_forum_id;

  RETURN v_forum_id;
END;
$$ LANGUAGE plpgsql;

-- Create autopromoción forums for ALL existing countries
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM countries ORDER BY name LOOP
    PERFORM create_autopromo_forum(c.id);
  END LOOP;
  RAISE NOTICE 'Autopromoción forums created for all countries';
END $$;

-- Update existing forums: set country_id from country_code where possible
UPDATE forums f SET country_id = c.id
FROM countries c
WHERE f.country_code = c.iso_code
AND f.country_id IS NULL;
