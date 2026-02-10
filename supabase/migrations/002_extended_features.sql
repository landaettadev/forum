-- =============================================
-- FASE 2: Extended Features Migration
-- =============================================

-- Continents table
CREATE TABLE IF NOT EXISTS continents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT,
  name_en TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  continent_id UUID REFERENCES continents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT,
  name_en TEXT,
  flag_emoji TEXT,
  iso_code CHAR(2),
  capacity_level TEXT DEFAULT 'medium' CHECK (capacity_level IN ('high', 'medium', 'low')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regions/Cities table (subforos por ciudad)
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  name_es TEXT,
  name_en TEXT,
  forum_id UUID REFERENCES forums(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_id, slug)
);

ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT;

-- User IP tracking
CREATE TABLE IF NOT EXISTS user_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_ips_user_id ON user_ips(user_id);
CREATE INDEX idx_user_ips_created_at ON user_ips(created_at DESC);

-- Followers system
CREATE TABLE IF NOT EXISTS user_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_followers_follower ON user_followers(follower_id);
CREATE INDEX idx_followers_following ON user_followers(following_id);

-- User blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);

-- Reports system
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy reports table has the new columns when migrating from base schema
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);

-- Moderation logs
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  target_thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'warn', 'delete_post', 'delete_thread', 'edit_post', 
    'lock_thread', 'unlock_thread', 'ban', 'unban', 
    'suspend', 'unsuspend', 'verify', 'unverify',
    'promote', 'demote', 'delete_user'
  )),
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mod_logs_moderator ON moderation_logs(moderator_id);
CREATE INDEX idx_mod_logs_target_user ON moderation_logs(target_user_id);
CREATE INDEX idx_mod_logs_action ON moderation_logs(action);
CREATE INDEX idx_mod_logs_created ON moderation_logs(created_at DESC);

-- User suspensions
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suspensions_user ON user_suspensions(user_id);
CREATE INDEX idx_suspensions_active ON user_suspensions(is_active) WHERE is_active = TRUE;

-- Media gallery
CREATE TABLE IF NOT EXISTS media_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'gif')),
  title TEXT,
  description TEXT,
  is_nsfw BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_user ON media_gallery(user_id);
CREATE INDEX idx_media_created ON media_gallery(created_at DESC);
CREATE INDEX idx_media_approved ON media_gallery(is_approved) WHERE is_approved = TRUE;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'reply', 'mention', 'quote', 'follow', 'like', 
    'message', 'verification_approved', 'verification_rejected',
    'suspension', 'warning', 'system'
  )),
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Chat messages (for floating chat)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_conversation ON chat_messages(sender_id, receiver_id, created_at DESC);

-- Profile wall posts
CREATE TABLE IF NOT EXISTS profile_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profile_posts_profile ON profile_posts(profile_id);
CREATE INDEX idx_profile_posts_created ON profile_posts(created_at DESC);

-- Extend profiles table with new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_post_links BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;

-- Extend posts table with IP tracking
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Extend threads table
ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Link forums to geographic regions
ALTER TABLE forums ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE forums ADD COLUMN IF NOT EXISTS continent_id UUID REFERENCES continents(id) ON DELETE SET NULL;

-- =============================================
-- Seed data for continents and countries
-- =============================================

-- Continents
INSERT INTO continents (name, slug, name_es, name_en, display_order) VALUES
('América del Norte', 'america-norte', 'América del Norte', 'North America', 1),
('América Latina', 'america-latina', 'América Latina', 'Latin America', 2),
('Europa Occidental', 'europa-occidental', 'Europa Occidental', 'Western Europe', 3),
('Europa del Este', 'europa-este', 'Europa del Este', 'Eastern Europe', 4),
('Asia', 'asia', 'Asia', 'Asia', 5)
ON CONFLICT (slug) DO NOTHING;

-- Countries - North America (High capacity)
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'United States', 'united-states', 'Estados Unidos', 'United States', '🇺🇸', 'US', 'high', 1
FROM continents c WHERE c.slug = 'america-norte'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Mexico', 'mexico', 'México', 'Mexico', '🇲🇽', 'MX', 'high', 2
FROM continents c WHERE c.slug = 'america-norte'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Canada', 'canada', 'Canadá', 'Canada', '🇨🇦', 'CA', 'high', 3
FROM continents c WHERE c.slug = 'america-norte'
ON CONFLICT (slug) DO NOTHING;

-- Countries - Latin America (High capacity)
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Colombia', 'colombia', 'Colombia', 'Colombia', '🇨🇴', 'CO', 'high', 1
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Argentina', 'argentina', 'Argentina', 'Argentina', '🇦🇷', 'AR', 'high', 2
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Brasil', 'brasil', 'Brasil', 'Brazil', '🇧🇷', 'BR', 'high', 3
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Chile', 'chile', 'Chile', 'Chile', '🇨🇱', 'CL', 'high', 4
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Peru', 'peru', 'Perú', 'Peru', '🇵🇪', 'PE', 'high', 5
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Panama', 'panama', 'Panamá', 'Panama', '🇵🇦', 'PA', 'high', 6
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Costa Rica', 'costa-rica', 'Costa Rica', 'Costa Rica', '🇨🇷', 'CR', 'high', 7
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Dominican Republic', 'dominican-republic', 'República Dominicana', 'Dominican Republic', '🇩🇴', 'DO', 'high', 8
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Puerto Rico', 'puerto-rico', 'Puerto Rico', 'Puerto Rico', '🇵🇷', 'PR', 'high', 9
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Uruguay', 'uruguay', 'Uruguay', 'Uruguay', '🇺🇾', 'UY', 'high', 10
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Ecuador', 'ecuador', 'Ecuador', 'Ecuador', '🇪🇨', 'EC', 'high', 11
FROM continents c WHERE c.slug = 'america-latina'
ON CONFLICT (slug) DO NOTHING;

-- Countries - Western Europe (High capacity)
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'España', 'espana', 'España', 'Spain', '🇪🇸', 'ES', 'high', 1
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'France', 'france', 'Francia', 'France', '🇫🇷', 'FR', 'high', 2
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Germany', 'germany', 'Alemania', 'Germany', '🇩🇪', 'DE', 'high', 3
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Italy', 'italy', 'Italia', 'Italy', '🇮🇹', 'IT', 'high', 4
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'United Kingdom', 'united-kingdom', 'Reino Unido', 'United Kingdom', '🇬🇧', 'GB', 'high', 5
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Netherlands', 'netherlands', 'Países Bajos', 'Netherlands', '🇳🇱', 'NL', 'high', 6
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Switzerland', 'switzerland', 'Suiza', 'Switzerland', '🇨🇭', 'CH', 'high', 7
FROM continents c WHERE c.slug = 'europa-occidental'
ON CONFLICT (slug) DO NOTHING;

-- Countries - Eastern Europe (Medium capacity)
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Portugal', 'portugal', 'Portugal', 'Portugal', '🇵🇹', 'PT', 'medium', 1
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Poland', 'poland', 'Polonia', 'Poland', '🇵🇱', 'PL', 'medium', 2
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Romania', 'romania', 'Rumania', 'Romania', '🇷🇴', 'RO', 'medium', 3
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Czech Republic', 'czech-republic', 'República Checa', 'Czech Republic', '🇨🇿', 'CZ', 'medium', 4
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Austria', 'austria', 'Austria', 'Austria', '🇦🇹', 'AT', 'medium', 5
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Sweden', 'sweden', 'Suecia', 'Sweden', '🇸🇪', 'SE', 'medium', 6
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Denmark', 'denmark', 'Dinamarca', 'Denmark', '🇩🇰', 'DK', 'medium', 7
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Finland', 'finland', 'Finlandia', 'Finland', '🇫🇮', 'FI', 'medium', 8
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Ireland', 'ireland', 'Irlanda', 'Ireland', '🇮🇪', 'IE', 'medium', 9
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Greece', 'greece', 'Grecia', 'Greece', '🇬🇷', 'GR', 'medium', 10
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Croatia', 'croatia', 'Croacia', 'Croatia', '🇭🇷', 'HR', 'medium', 11
FROM continents c WHERE c.slug = 'europa-este'
ON CONFLICT (slug) DO NOTHING;

-- Countries - Asia (High and Medium capacity)
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Japan', 'japan', 'Japón', 'Japan', '🇯🇵', 'JP', 'high', 1
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'South Korea', 'south-korea', 'Corea del Sur', 'South Korea', '🇰🇷', 'KR', 'high', 2
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Thailand', 'thailand', 'Tailandia', 'Thailand', '🇹🇭', 'TH', 'high', 3
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Singapore', 'singapore', 'Singapur', 'Singapore', '🇸🇬', 'SG', 'high', 4
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Hong Kong', 'hong-kong', 'Hong Kong', 'Hong Kong', '🇭🇰', 'HK', 'high', 5
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Turkey', 'turkey', 'Turquía', 'Turkey', '🇹🇷', 'TR', 'medium', 6
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Malaysia', 'malaysia', 'Malasia', 'Malaysia', '🇲🇾', 'MY', 'medium', 7
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Israel', 'israel', 'Israel', 'Israel', '🇮🇱', 'IL', 'medium', 8
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Philippines', 'philippines', 'Filipinas', 'Philippines', '🇵🇭', 'PH', 'medium', 9
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Indonesia', 'indonesia', 'Indonesia', 'Indonesia', '🇮🇩', 'ID', 'medium', 10
FROM continents c WHERE c.slug = 'asia'
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- Seed regions/cities for major countries
-- =============================================

-- USA Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'New York', 'new-york', 1 FROM countries c WHERE c.slug = 'united-states'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Miami', 'miami', 2 FROM countries c WHERE c.slug = 'united-states'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Los Angeles', 'los-angeles', 3 FROM countries c WHERE c.slug = 'united-states'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Las Vegas', 'las-vegas', 4 FROM countries c WHERE c.slug = 'united-states'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Houston', 'houston', 5 FROM countries c WHERE c.slug = 'united-states'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Mexico Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Ciudad de México', 'ciudad-de-mexico', 1 FROM countries c WHERE c.slug = 'mexico'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Guadalajara', 'guadalajara', 2 FROM countries c WHERE c.slug = 'mexico'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Monterrey', 'monterrey', 3 FROM countries c WHERE c.slug = 'mexico'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Cancún', 'cancun', 4 FROM countries c WHERE c.slug = 'mexico'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Canada Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Toronto', 'toronto', 1 FROM countries c WHERE c.slug = 'canada'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Vancouver', 'vancouver', 2 FROM countries c WHERE c.slug = 'canada'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Montreal', 'montreal', 3 FROM countries c WHERE c.slug = 'canada'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Colombia Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Bogotá', 'bogota', 1 FROM countries c WHERE c.slug = 'colombia'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Medellín', 'medellin', 2 FROM countries c WHERE c.slug = 'colombia'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Argentina Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Buenos Aires', 'buenos-aires', 1 FROM countries c WHERE c.slug = 'argentina'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Brasil Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'São Paulo', 'sao-paulo', 1 FROM countries c WHERE c.slug = 'brasil'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Rio de Janeiro', 'rio-de-janeiro', 2 FROM countries c WHERE c.slug = 'brasil'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Spain Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Madrid', 'madrid', 1 FROM countries c WHERE c.slug = 'espana'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Barcelona', 'barcelona', 2 FROM countries c WHERE c.slug = 'espana'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Valencia', 'valencia', 3 FROM countries c WHERE c.slug = 'espana'
ON CONFLICT (country_id, slug) DO NOTHING;

-- France Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Paris', 'paris', 1 FROM countries c WHERE c.slug = 'france'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Marseille', 'marseille', 2 FROM countries c WHERE c.slug = 'france'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Germany Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Berlin', 'berlin', 1 FROM countries c WHERE c.slug = 'germany'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Frankfurt', 'frankfurt', 2 FROM countries c WHERE c.slug = 'germany'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Munich', 'munich', 3 FROM countries c WHERE c.slug = 'germany'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Italy Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Milan', 'milan', 1 FROM countries c WHERE c.slug = 'italy'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Rome', 'rome', 2 FROM countries c WHERE c.slug = 'italy'
ON CONFLICT (country_id, slug) DO NOTHING;

-- UK Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'London', 'london', 1 FROM countries c WHERE c.slug = 'united-kingdom'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Manchester', 'manchester', 2 FROM countries c WHERE c.slug = 'united-kingdom'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Netherlands Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Amsterdam', 'amsterdam', 1 FROM countries c WHERE c.slug = 'netherlands'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Switzerland Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Zurich', 'zurich', 1 FROM countries c WHERE c.slug = 'switzerland'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Geneva', 'geneva', 2 FROM countries c WHERE c.slug = 'switzerland'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Japan Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Tokyo', 'tokyo', 1 FROM countries c WHERE c.slug = 'japan'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Osaka', 'osaka', 2 FROM countries c WHERE c.slug = 'japan'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Thailand Cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Bangkok', 'bangkok', 1 FROM countries c WHERE c.slug = 'thailand'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Phuket', 'phuket', 2 FROM countries c WHERE c.slug = 'thailand'
ON CONFLICT (country_id, slug) DO NOTHING;

-- Other single-city countries
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Santiago', 'santiago', 1 FROM countries c WHERE c.slug = 'chile'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Lima', 'lima', 1 FROM countries c WHERE c.slug = 'peru'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Ciudad de Panamá', 'ciudad-de-panama', 1 FROM countries c WHERE c.slug = 'panama'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'San José', 'san-jose', 1 FROM countries c WHERE c.slug = 'costa-rica'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Santo Domingo', 'santo-domingo', 1 FROM countries c WHERE c.slug = 'dominican-republic'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'San Juan', 'san-juan', 1 FROM countries c WHERE c.slug = 'puerto-rico'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Montevideo', 'montevideo', 1 FROM countries c WHERE c.slug = 'uruguay'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Quito', 'quito', 1 FROM countries c WHERE c.slug = 'ecuador'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Guayaquil', 'guayaquil', 2 FROM countries c WHERE c.slug = 'ecuador'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Seoul', 'seoul', 1 FROM countries c WHERE c.slug = 'south-korea'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Istanbul', 'istanbul', 1 FROM countries c WHERE c.slug = 'turkey'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Kuala Lumpur', 'kuala-lumpur', 1 FROM countries c WHERE c.slug = 'malaysia'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Tel Aviv', 'tel-aviv', 1 FROM countries c WHERE c.slug = 'israel'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Manila', 'manila', 1 FROM countries c WHERE c.slug = 'philippines'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Jakarta', 'jakarta', 1 FROM countries c WHERE c.slug = 'indonesia'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Bali', 'bali', 2 FROM countries c WHERE c.slug = 'indonesia'
ON CONFLICT (country_id, slug) DO NOTHING;

-- European cities
INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Lisbon', 'lisbon', 1 FROM countries c WHERE c.slug = 'portugal'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Warsaw', 'warsaw', 1 FROM countries c WHERE c.slug = 'poland'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Bucharest', 'bucharest', 1 FROM countries c WHERE c.slug = 'romania'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Prague', 'prague', 1 FROM countries c WHERE c.slug = 'czech-republic'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Vienna', 'vienna', 1 FROM countries c WHERE c.slug = 'austria'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Stockholm', 'stockholm', 1 FROM countries c WHERE c.slug = 'sweden'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Copenhagen', 'copenhagen', 1 FROM countries c WHERE c.slug = 'denmark'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Helsinki', 'helsinki', 1 FROM countries c WHERE c.slug = 'finland'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Dublin', 'dublin', 1 FROM countries c WHERE c.slug = 'ireland'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Athens', 'athens', 1 FROM countries c WHERE c.slug = 'greece'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO regions (country_id, name, slug, display_order)
SELECT c.id, 'Zagreb', 'zagreb', 1 FROM countries c WHERE c.slug = 'croatia'
ON CONFLICT (country_id, slug) DO NOTHING;
