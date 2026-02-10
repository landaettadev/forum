-- Add last_post_author_id to threads table
ALTER TABLE threads ADD COLUMN IF NOT EXISTS last_post_author_id uuid REFERENCES profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_threads_last_post_author ON threads(last_post_author_id);

-- Update existing threads with last post author
UPDATE threads t
SET last_post_author_id = (
  SELECT author_id 
  FROM posts p 
  WHERE p.thread_id = t.id 
  ORDER BY p.created_at DESC 
  LIMIT 1
)
WHERE last_post_author_id IS NULL;

-- Create or replace function to update last post info
CREATE OR REPLACE FUNCTION update_thread_last_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads
  SET 
    last_post_id = NEW.id,
    last_post_at = NEW.created_at,
    last_post_author_id = NEW.author_id,
    replies_count = replies_count + 1
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_post_created ON posts;

CREATE TRIGGER on_post_created
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_post();
