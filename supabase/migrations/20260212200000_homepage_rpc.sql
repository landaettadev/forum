-- RPC to consolidate homepage data into a single database call
-- Returns countries with continent info, thread/post counts per country,
-- and the latest post per country — all in one query.
CREATE OR REPLACE FUNCTION get_homepage_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH country_stats AS (
    SELECT
      r.country_id,
      COUNT(DISTINCT t.id) AS thread_count,
      COALESCE(SUM(1 + COALESCE(t.replies_count, 0)), 0) AS post_count
    FROM threads t
    INNER JOIN regions r ON t.region_id = r.id
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
      'slug', c.slug,
      'flag_emoji', c.flag_emoji,
      'iso_code', c.iso_code,
      'display_order', c.display_order,
      'continent', jsonb_build_object(
        'slug', cont.slug,
        'name_es', cont.name_es,
        'name_en', cont.name_en,
        'display_order', cont.display_order
      ),
      'regions', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', rg.name, 'slug', rg.slug)), '[]'::jsonb)
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
