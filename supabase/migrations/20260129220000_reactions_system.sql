-- Reactions system for posts (emoji reactions)

-- Available reaction types
CREATE TABLE IF NOT EXISTS reaction_types (
  id text PRIMARY KEY,
  emoji text NOT NULL,
  label text NOT NULL,
  display_order integer DEFAULT 0
);

-- Insert default reaction types
INSERT INTO reaction_types (id, emoji, label, display_order) VALUES
  ('like', '👍', 'Me gusta', 1),
  ('love', '❤️', 'Me encanta', 2),
  ('laugh', '😂', 'Jaja', 3),
  ('wow', '😮', 'Wow', 4),
  ('sad', '😢', 'Triste', 5),
  ('angry', '😠', 'Enfadado', 6),
  ('fire', '🔥', 'Fuego', 7),
  ('100', '💯', 'Perfecto', 8)
ON CONFLICT (id) DO NOTHING;

-- Table to store post reactions
CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text REFERENCES reaction_types(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);

-- RLS policies
ALTER TABLE reaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reaction types
CREATE POLICY "Anyone can view reaction types"
  ON reaction_types FOR SELECT USING (true);

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON post_reactions FOR SELECT USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add reactions"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their reactions"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get reactions for a post
CREATE OR REPLACE FUNCTION get_post_reactions(p_post_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  reaction_type text,
  emoji text,
  count bigint,
  user_reacted boolean
) AS $$
  SELECT 
    rt.id as reaction_type,
    rt.emoji,
    COUNT(pr.id) as count,
    CASE WHEN p_user_id IS NOT NULL THEN
      EXISTS(SELECT 1 FROM post_reactions WHERE post_id = p_post_id AND user_id = p_user_id AND reaction_type = rt.id)
    ELSE false END as user_reacted
  FROM reaction_types rt
  LEFT JOIN post_reactions pr ON pr.reaction_type = rt.id AND pr.post_id = p_post_id
  GROUP BY rt.id, rt.emoji, rt.display_order
  HAVING COUNT(pr.id) > 0 OR p_user_id IS NOT NULL
  ORDER BY rt.display_order;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to toggle a reaction
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_post_id uuid,
  p_user_id uuid,
  p_reaction_type text
) RETURNS json AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM post_reactions 
    WHERE post_id = p_post_id 
    AND user_id = p_user_id 
    AND reaction_type = p_reaction_type
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove reaction
    DELETE FROM post_reactions 
    WHERE post_id = p_post_id 
    AND user_id = p_user_id 
    AND reaction_type = p_reaction_type;
    
    RETURN json_build_object('success', true, 'action', 'removed');
  ELSE
    -- Add reaction
    INSERT INTO post_reactions (post_id, user_id, reaction_type)
    VALUES (p_post_id, p_user_id, p_reaction_type);
    
    RETURN json_build_object('success', true, 'action', 'added');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reaction summary for multiple posts
CREATE OR REPLACE FUNCTION get_posts_reactions_summary(p_post_ids uuid[])
RETURNS TABLE (
  post_id uuid,
  reactions json
) AS $$
  SELECT 
    sub.post_id,
    json_agg(
      json_build_object(
        'type', sub.reaction_type,
        'emoji', sub.emoji,
        'count', sub.reaction_count
      ) ORDER BY sub.display_order
    ) as reactions
  FROM (
    SELECT 
      pr.post_id,
      pr.reaction_type,
      rt.emoji,
      rt.display_order,
      COUNT(*) as reaction_count
    FROM post_reactions pr
    JOIN reaction_types rt ON rt.id = pr.reaction_type
    WHERE pr.post_id = ANY(p_post_ids)
    GROUP BY pr.post_id, pr.reaction_type, rt.emoji, rt.display_order
  ) sub
  GROUP BY sub.post_id;
$$ LANGUAGE sql SECURITY DEFINER;
