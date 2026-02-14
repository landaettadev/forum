-- ============================================================
-- Admin Forums: Support, News, Rules & Templates
-- ============================================================

-- 1. Add forum_type column to forums table
ALTER TABLE forums ADD COLUMN IF NOT EXISTS forum_type text DEFAULT NULL;
COMMENT ON COLUMN forums.forum_type IS 'Special forum types: support (per-user visibility), news, rules. NULL = normal forum.';

-- 2. Create the admin category (appears last with high display_order)
INSERT INTO categories (name, slug, description, display_order, is_private)
VALUES ('TS Rating', 'ts-rating-admin', 'Soporte, noticias y reglas del foro', 999, false)
ON CONFLICT (slug) DO NOTHING;

-- 3. Create the three admin forums
DO $$
DECLARE
  _cat_id uuid;
BEGIN
  SELECT id INTO _cat_id FROM categories WHERE slug = 'ts-rating-admin';

  IF _cat_id IS NULL THEN
    RAISE NOTICE 'Admin category not found, skipping forum creation';
    RETURN;
  END IF;

  -- 3a. Support forum (private per-user threads)
  INSERT INTO forums (category_id, name, slug, description, display_order, is_private, forum_type)
  VALUES (
    _cat_id,
    'Soporte / Support',
    'soporte',
    'Abre un ticket de soporte. Solo tú y el equipo pueden ver tu tema.',
    1,
    false,
    'support'
  ) ON CONFLICT DO NOTHING;

  -- 3b. News / Announcements forum
  INSERT INTO forums (category_id, name, slug, description, display_order, is_private, forum_type)
  VALUES (
    _cat_id,
    'Noticias del Foro / Forum News',
    'noticias-del-foro',
    'Anuncios oficiales, actualizaciones y novedades de TS Rating.',
    2,
    false,
    'news'
  ) ON CONFLICT DO NOTHING;

  -- 3c. Rules & Templates forum
  INSERT INTO forums (category_id, name, slug, description, display_order, is_private, forum_type)
  VALUES (
    _cat_id,
    'Reglas y Plantillas / Rules & Templates',
    'reglas-y-plantillas',
    'Normas de la comunidad, plantillas para reseñas y guías de uso.',
    3,
    false,
    'rules'
  ) ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 4. RLS policy: Support forum threads — users see only their own
-- ============================================================
-- We need to DROP the existing "Threads are publicly viewable" policy
-- and replace it with one that accounts for support forums.

DROP POLICY IF EXISTS "Threads are publicly viewable" ON threads;

CREATE POLICY "Threads are publicly viewable"
  ON threads FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM forums f
      WHERE f.id = threads.forum_id
      AND (
        -- Normal / non-support forums: standard visibility
        (COALESCE(f.forum_type, '') <> 'support'
          AND (
            NOT f.is_private
            OR (auth.uid() IS NOT NULL AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = true
            ))
          )
        )
        OR
        -- Support forum: only author sees own thread, admins/mods see all
        (f.forum_type = 'support'
          AND (
            threads.author_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
            )
          )
        )
      )
    )
  );

-- 5. News forum: only admins can create threads (announcements)
-- (Regular users can still reply/read, but only admins post new threads)
-- We handle this at the application level, not RLS, since the INSERT policy
-- already requires auth.uid() = author_id. We'll check role in the UI.
