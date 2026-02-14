-- Fix forum stats inconsistency across views
-- Problem 1: RPC used stale replies_count cache instead of actual post counts
-- Problem 2: Missing localized name columns in RPC response

CREATE OR REPLACE FUNCTION get_homepage_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH country_stats AS (
    SELECT
      r.country_id,
      COUNT(DISTINCT t.id) AS thread_count,
      COUNT(p.id) AS post_count
    FROM threads t
    INNER JOIN regions r ON t.region_id = r.id
    LEFT JOIN posts p ON p.thread_id = t.id
    WHERE t.region_id IS NOT NULL
    GROUP BY r.country_id
  ),
  latest_posts AS (
    SELECT DISTINCT ON (r.country_id)
      r.country_id,
      t.id AS thread_id,
      t.title AS thread_title,
      t.last_post_at,
      COALESCE(lpa.username, a.username) AS author_username,
      COALESCE(lpa.avatar_url, a.avatar_url) AS author_avatar
    FROM threads t
    INNER JOIN regions r ON t.region_id = r.id
    LEFT JOIN profiles lpa ON t.last_post_author_id = lpa.id
    LEFT JOIN profiles a ON t.author_id = a.id
    WHERE t.region_id IS NOT NULL
    ORDER BY r.country_id, t.last_post_at DESC NULLS LAST
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'name_es', c.name_es,
      'name_en', c.name_en,
      'name_fr', c.name_fr,
      'name_pt', c.name_pt,
      'name_de', c.name_de,
      'name_it', c.name_it,
      'name_ja', c.name_ja,
      'name_zh', c.name_zh,
      'name_ru', c.name_ru,
      'name_ar', c.name_ar,
      'name_ko', c.name_ko,
      'name_hi', c.name_hi,
      'name_tr', c.name_tr,
      'name_pl', c.name_pl,
      'name_nl', c.name_nl,
      'name_sv', c.name_sv,
      'name_id', c.name_id,
      'name_th', c.name_th,
      'slug', c.slug,
      'flag_emoji', c.flag_emoji,
      'iso_code', c.iso_code,
      'display_order', c.display_order,
      'capacity_level', c.capacity_level,
      'continent', jsonb_build_object(
        'slug', cont.slug,
        'name_es', cont.name_es,
        'name_en', cont.name_en,
        'display_order', cont.display_order
      ),
      'regions', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', rg.id, 'name', rg.name, 'slug', rg.slug) ORDER BY rg.display_order), '[]'::jsonb)
        FROM regions rg WHERE rg.country_id = c.id
      ),
      'thread_count', COALESCE(cs.thread_count, 0),
      'post_count', COALESCE(cs.post_count, 0),
      'last_post', CASE WHEN lp.thread_id IS NOT NULL THEN
        jsonb_build_object(
          'thread_id', lp.thread_id,
          'thread_title', lp.thread_title,
          'created_at', lp.last_post_at,
          'author_username', lp.author_username,
          'author_avatar', lp.author_avatar
        )
      ELSE NULL END
    ) ORDER BY c.display_order
  ) INTO result
  FROM countries c
  LEFT JOIN continents cont ON c.continent_id = cont.id
  LEFT JOIN country_stats cs ON cs.country_id = c.id
  LEFT JOIN latest_posts lp ON lp.country_id = c.id;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
