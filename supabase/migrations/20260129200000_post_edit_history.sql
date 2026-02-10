-- Post edit history system

-- Table to store edit history
CREATE TABLE IF NOT EXISTS post_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  editor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  previous_content text NOT NULL,
  new_content text NOT NULL,
  edit_reason text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_edits_post ON post_edits(post_id);
CREATE INDEX IF NOT EXISTS idx_post_edits_created ON post_edits(created_at DESC);

-- RLS policies
ALTER TABLE post_edits ENABLE ROW LEVEL SECURITY;

-- Anyone can view edit history
CREATE POLICY "Anyone can view edit history"
  ON post_edits FOR SELECT
  USING (true);

-- Only post author or mods can create edit records
CREATE POLICY "Authors and mods can create edit history"
  ON post_edits FOR INSERT
  WITH CHECK (
    auth.uid() = editor_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'mod')
    )
  );

-- Function to save edit history before updating a post
CREATE OR REPLACE FUNCTION save_post_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO post_edits (post_id, editor_id, previous_content, new_content)
    VALUES (OLD.id, auth.uid(), OLD.content, NEW.content);
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically save edit history
DROP TRIGGER IF EXISTS on_post_edit ON posts;

CREATE TRIGGER on_post_edit
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION save_post_edit_history();

-- Function to get edit count for a post
CREATE OR REPLACE FUNCTION get_post_edit_count(p_post_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM post_edits
  WHERE post_id = p_post_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get edit history for a post
CREATE OR REPLACE FUNCTION get_post_edit_history(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  editor_username text,
  editor_avatar text,
  previous_content text,
  new_content text,
  edit_reason text,
  created_at timestamptz
) AS $$
  SELECT 
    pe.id,
    p.username as editor_username,
    p.avatar_url as editor_avatar,
    pe.previous_content,
    pe.new_content,
    pe.edit_reason,
    pe.created_at
  FROM post_edits pe
  LEFT JOIN profiles p ON pe.editor_id = p.id
  WHERE pe.post_id = p_post_id
  ORDER BY pe.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;
