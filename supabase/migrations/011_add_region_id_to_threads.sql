-- Add region_id column to threads table
ALTER TABLE threads ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id) ON DELETE SET NULL;

-- Create index for faster queries by region
CREATE INDEX IF NOT EXISTS idx_threads_region_id ON threads(region_id);
