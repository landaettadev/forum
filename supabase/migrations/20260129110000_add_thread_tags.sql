-- Add tag system to threads
-- Tags: review, ask, general

-- Add tag column to threads table
ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS tag TEXT CHECK (tag IN ('review', 'ask', 'general'));

-- Set default tag for existing threads
UPDATE threads SET tag = 'general' WHERE tag IS NULL;

-- Make tag required for new threads
ALTER TABLE threads
  ALTER COLUMN tag SET NOT NULL,
  ALTER COLUMN tag SET DEFAULT 'general';
