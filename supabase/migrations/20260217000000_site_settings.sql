-- =============================================
-- Site Settings: Global configuration for the site
-- Includes social media links, site info, etc.
-- =============================================

-- Create site_settings table (key-value store for global settings)
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default social media settings
INSERT INTO site_settings (key, value, description) VALUES
  ('social_twitter', '', 'Twitter/X profile URL'),
  ('social_instagram', '', 'Instagram profile URL'),
  ('social_telegram', '', 'Telegram channel/group URL'),
  ('social_tiktok', '', 'TikTok profile URL'),
  ('social_discord', '', 'Discord server invite URL'),
  ('social_reddit', '', 'Reddit community URL')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert settings
CREATE POLICY "Admins can insert site settings"
  ON site_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete settings
CREATE POLICY "Admins can delete site settings"
  ON site_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- Grant permissions
GRANT SELECT ON site_settings TO anon, authenticated;
GRANT UPDATE, INSERT, DELETE ON site_settings TO authenticated;
