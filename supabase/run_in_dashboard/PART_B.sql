-- =============================================
-- FILE: 20260129170000_ads_classifieds_system.sql
-- =============================================
-- =============================================
-- SISTEMA DE ANUNCIOS/CLASIFICADOS PARA ESCORTS
-- =============================================

-- Tabla principal de anuncios
CREATE TABLE IF NOT EXISTS escort_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- InformaciÃ³n bÃ¡sica
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- UbicaciÃ³n
  country_id UUID REFERENCES countries(id),
  region_id UUID REFERENCES regions(id),
  city VARCHAR(100),
  neighborhood VARCHAR(100),
  
  -- Contacto
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  telegram VARCHAR(100),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- CaracterÃ­sticas fÃ­sicas
  age INTEGER CHECK (age >= 18 AND age <= 99),
  height INTEGER, -- en cm
  weight INTEGER, -- en kg
  ethnicity VARCHAR(50),
  hair_color VARCHAR(50),
  eye_color VARCHAR(50),
  body_type VARCHAR(50),
  
  -- Servicios y tarifas
  services JSONB DEFAULT '[]'::jsonb, -- Array de servicios ofrecidos
  rates JSONB DEFAULT '{}'::jsonb, -- {"30min": 100, "1hour": 150, "overnight": 500}
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Disponibilidad
  availability JSONB DEFAULT '{}'::jsonb, -- {"monday": ["09:00-18:00"], "tuesday": [...]}
  incall BOOLEAN DEFAULT false, -- Recibe en su lugar
  outcall BOOLEAN DEFAULT false, -- Va al lugar del cliente
  
  -- Estado y moderaciÃ³n
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'rejected', 'expired')),
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false, -- Anuncio destacado (VIP)
  is_vip BOOLEAN DEFAULT false,
  
  -- EstadÃ­sticas
  views_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0, -- Veces que mostraron el contacto
  favorites_count INTEGER DEFAULT 0,
  
  -- Fechas
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_bump_at TIMESTAMPTZ, -- Ãšltima vez que subiÃ³ el anuncio
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fotos de anuncios
CREATE TABLE IF NOT EXISTS escort_ad_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES escort_ads(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Foto verificada por moderaciÃ³n
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favoritos de anuncios
CREATE TABLE IF NOT EXISTS escort_ad_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES escort_ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ad_id)
);

-- Alertas de zona (notificaciones por nuevos anuncios)
CREATE TABLE IF NOT EXISTS zone_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id),
  region_id UUID REFERENCES regions(id),
  is_active BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, country_id, region_id)
);

-- Historial de vistas de anuncios (para estadÃ­sticas)
CREATE TABLE IF NOT EXISTS escort_ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES escort_ads(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios predefinidos
CREATE TABLE IF NOT EXISTS escort_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_key VARCHAR(100) NOT NULL UNIQUE, -- Clave para i18n
  category VARCHAR(50), -- 'basic', 'premium', 'special'
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar servicios predefinidos
INSERT INTO escort_services (name_key, category, display_order) VALUES
  ('service_girlfriend_experience', 'premium', 1),
  ('service_massage', 'basic', 2),
  ('service_oral', 'basic', 3),
  ('service_anal', 'premium', 4),
  ('service_fetish', 'special', 5),
  ('service_bdsm', 'special', 6),
  ('service_duo', 'premium', 7),
  ('service_overnight', 'premium', 8),
  ('service_travel', 'special', 9),
  ('service_video_call', 'basic', 10)
ON CONFLICT (name_key) DO NOTHING;

-- Ãndices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_escort_ads_user ON escort_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_escort_ads_country ON escort_ads(country_id);
CREATE INDEX IF NOT EXISTS idx_escort_ads_region ON escort_ads(region_id);
CREATE INDEX IF NOT EXISTS idx_escort_ads_status ON escort_ads(status);
CREATE INDEX IF NOT EXISTS idx_escort_ads_featured ON escort_ads(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_escort_ads_created ON escort_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escort_ad_photos_ad ON escort_ad_photos(ad_id);
CREATE INDEX IF NOT EXISTS idx_zone_alerts_user ON zone_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_alerts_country ON zone_alerts(country_id);

-- RLS Policies
ALTER TABLE escort_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE escort_ad_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE escort_ad_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escort_ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE escort_services ENABLE ROW LEVEL SECURITY;

-- escort_services es una tabla de catÃ¡logo de solo lectura
CREATE POLICY "Servicios visibles para todos" ON escort_services
  FOR SELECT USING (true);

-- PolÃ­ticas para escort_ads
CREATE POLICY "Anuncios activos visibles para todos" ON escort_ads
  FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear sus anuncios" ON escort_ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden editar sus anuncios" ON escort_ads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus anuncios" ON escort_ads
  FOR DELETE USING (auth.uid() = user_id);

-- PolÃ­ticas para fotos
CREATE POLICY "Fotos visibles si el anuncio es visible" ON escort_ad_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM escort_ads WHERE id = ad_id AND (status = 'active' OR user_id = auth.uid()))
  );

CREATE POLICY "Usuarios pueden gestionar fotos de sus anuncios" ON escort_ad_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM escort_ads WHERE id = ad_id AND user_id = auth.uid())
  );

-- PolÃ­ticas para favoritos
CREATE POLICY "Usuarios ven sus favoritos" ON escort_ad_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden gestionar sus favoritos" ON escort_ad_favorites
  FOR ALL USING (auth.uid() = user_id);

-- PolÃ­ticas para alertas
CREATE POLICY "Usuarios ven sus alertas" ON zone_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden gestionar sus alertas" ON zone_alerts
  FOR ALL USING (auth.uid() = user_id);

-- PolÃ­ticas para vistas (insertar sin autenticaciÃ³n para tracking)
CREATE POLICY "Cualquiera puede registrar vistas" ON escort_ad_views
  FOR INSERT WITH CHECK (true);

-- FunciÃ³n para incrementar vistas
CREATE OR REPLACE FUNCTION increment_ad_views(p_ad_id UUID, p_viewer_id UUID DEFAULT NULL, p_ip INET DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Insertar registro de vista
  INSERT INTO escort_ad_views (ad_id, viewer_id, ip_address)
  VALUES (p_ad_id, p_viewer_id, p_ip);
  
  -- Actualizar contador
  UPDATE escort_ads SET views_count = views_count + 1 WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para toggle favorito de anuncio
CREATE OR REPLACE FUNCTION toggle_ad_favorite(p_ad_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM escort_ad_favorites WHERE ad_id = p_ad_id AND user_id = p_user_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM escort_ad_favorites WHERE ad_id = p_ad_id AND user_id = p_user_id;
    UPDATE escort_ads SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = p_ad_id;
    RETURN jsonb_build_object('success', true, 'favorited', false);
  ELSE
    INSERT INTO escort_ad_favorites (ad_id, user_id) VALUES (p_ad_id, p_user_id);
    UPDATE escort_ads SET favorites_count = favorites_count + 1 WHERE id = p_ad_id;
    RETURN jsonb_build_object('success', true, 'favorited', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para notificar nuevos anuncios en zonas con alertas
CREATE OR REPLACE FUNCTION notify_zone_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_alert RECORD;
BEGIN
  -- Solo notificar cuando se publica un anuncio (status cambia a 'active')
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    FOR v_alert IN
      SELECT za.user_id, za.notify_email, za.notify_push
      FROM zone_alerts za
      WHERE za.is_active = true
        AND (za.country_id = NEW.country_id OR za.country_id IS NULL)
        AND (za.region_id = NEW.region_id OR za.region_id IS NULL)
        AND za.user_id != NEW.user_id
    LOOP
      -- Crear notificaciÃ³n
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_alert.user_id,
        'new_ad_in_zone',
        'Nuevo anuncio en tu zona',
        'Se ha publicado un nuevo anuncio que podrÃ­a interesarte',
        jsonb_build_object('ad_id', NEW.id, 'ad_title', NEW.title)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificaciones de nuevos anuncios
DROP TRIGGER IF EXISTS trigger_notify_zone_alerts ON escort_ads;
CREATE TRIGGER trigger_notify_zone_alerts
  AFTER INSERT OR UPDATE ON escort_ads
  FOR EACH ROW EXECUTE FUNCTION notify_zone_alerts();

-- AÃ±adir campo para IP del usuario en profiles (para geolocalizaciÃ³n)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS detected_country_id UUID REFERENCES countries(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ip INET;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_country_id UUID REFERENCES countries(id);


-- =============================================
-- FILE: 20260129180000_thread_last_author.sql
-- =============================================
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


-- =============================================
-- FILE: 20260129190000_mentions_system.sql
-- =============================================
-- Mentions system for @username notifications

-- Table to store mentions
CREATE TABLE IF NOT EXISTS mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mentioner_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post ON mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_thread ON mentions(thread_id);
CREATE INDEX IF NOT EXISTS idx_mentions_unread ON mentions(mentioned_user_id, is_read) WHERE is_read = false;

-- RLS policies
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- Users can view their own mentions
CREATE POLICY "Users can view own mentions"
  ON mentions FOR SELECT
  USING (auth.uid() = mentioned_user_id);

-- Users can mark their mentions as read
CREATE POLICY "Users can update own mentions"
  ON mentions FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- System can insert mentions (via service role or trigger)
CREATE POLICY "Service can insert mentions"
  ON mentions FOR INSERT
  WITH CHECK (true);

-- Function to extract usernames from text and create mentions
CREATE OR REPLACE FUNCTION process_mentions(
  p_post_id uuid,
  p_thread_id uuid,
  p_content text,
  p_author_id uuid
) RETURNS void AS $$
DECLARE
  v_username text;
  v_user_id uuid;
  v_matches text[];
BEGIN
  -- Extract all @mentions using regex
  SELECT array_agg(DISTINCT match[1])
  INTO v_matches
  FROM regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g') AS match;
  
  IF v_matches IS NOT NULL THEN
    FOREACH v_username IN ARRAY v_matches
    LOOP
      -- Find user by username (case insensitive)
      SELECT id INTO v_user_id
      FROM profiles
      WHERE lower(username) = lower(v_username)
      AND id != p_author_id; -- Don't mention yourself
      
      IF v_user_id IS NOT NULL THEN
        -- Insert mention (ignore if duplicate)
        INSERT INTO mentions (post_id, mentioned_user_id, mentioner_user_id, thread_id)
        VALUES (p_post_id, v_user_id, p_author_id, p_thread_id)
        ON CONFLICT (post_id, mentioned_user_id) DO NOTHING;
        
        -- Create notification for the mentioned user
        INSERT INTO notifications (user_id, type, title, message, link, related_user_id)
        SELECT 
          v_user_id,
          'mention',
          'Te han mencionado',
          (SELECT username FROM profiles WHERE id = p_author_id) || ' te mencionÃ³ en un post',
          '/hilo/' || p_thread_id,
          p_author_id
        WHERE NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = v_user_id 
          AND type = 'mention' 
          AND link = '/hilo/' || p_thread_id
          AND created_at > now() - interval '1 hour'
        );
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process mentions when a post is created
CREATE OR REPLACE FUNCTION trigger_process_mentions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_mentions(NEW.id, NEW.thread_id, NEW.content, NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_process_mentions ON posts;

CREATE TRIGGER on_post_process_mentions
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_mentions();

-- Function to get unread mentions count
CREATE OR REPLACE FUNCTION get_unread_mentions_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM mentions
  WHERE mentioned_user_id = p_user_id
  AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to mark mentions as read
CREATE OR REPLACE FUNCTION mark_mentions_read(p_user_id uuid, p_thread_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_thread_id IS NOT NULL THEN
    UPDATE mentions
    SET is_read = true
    WHERE mentioned_user_id = p_user_id
    AND thread_id = p_thread_id
    AND is_read = false;
  ELSE
    UPDATE mentions
    SET is_read = true
    WHERE mentioned_user_id = p_user_id
    AND is_read = false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- FILE: 20260129200000_post_edit_history.sql
-- =============================================
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


-- =============================================
-- FILE: 20260129210000_polls_system.sql
-- =============================================
-- Polls/Surveys system for threads

-- Table for polls
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  question text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  allow_multiple boolean DEFAULT false,
  show_results_before_vote boolean DEFAULT false,
  ends_at timestamptz,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table for poll options
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table for poll votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_polls_thread ON polls(thread_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);

-- RLS policies
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view polls
CREATE POLICY "Anyone can view polls"
  ON polls FOR SELECT USING (true);

CREATE POLICY "Anyone can view poll options"
  ON poll_options FOR SELECT USING (true);

-- Only creator or admin can create polls
CREATE POLICY "Thread authors can create polls"
  ON polls FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Poll creators can add options"
  ON poll_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      WHERE id = poll_id AND created_by = auth.uid()
    )
  );

-- Users can vote if poll is not closed
CREATE POLICY "Users can vote on open polls"
  ON poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM polls
      WHERE id = poll_id AND (is_closed = true OR (ends_at IS NOT NULL AND ends_at < now()))
    )
  );

-- Users can see their own votes
CREATE POLICY "Users can view votes"
  ON poll_votes FOR SELECT
  USING (true);

-- Users can delete their own votes
CREATE POLICY "Users can remove their votes"
  ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get poll with vote counts
CREATE OR REPLACE FUNCTION get_poll_with_results(p_thread_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  poll_id uuid,
  question text,
  allow_multiple boolean,
  show_results_before_vote boolean,
  ends_at timestamptz,
  is_closed boolean,
  total_votes bigint,
  user_has_voted boolean,
  options json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as poll_id,
    p.question,
    p.allow_multiple,
    p.show_results_before_vote,
    p.ends_at,
    p.is_closed,
    COALESCE((SELECT COUNT(DISTINCT pv.user_id) FROM poll_votes pv WHERE pv.poll_id = p.id), 0) as total_votes,
    CASE WHEN p_user_id IS NOT NULL THEN
      EXISTS(SELECT 1 FROM poll_votes pv WHERE pv.poll_id = p.id AND pv.user_id = p_user_id)
    ELSE false END as user_has_voted,
    (
      SELECT json_agg(
        json_build_object(
          'id', po.id,
          'text', po.option_text,
          'votes', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id),
          'user_voted', CASE WHEN p_user_id IS NOT NULL THEN
            EXISTS(SELECT 1 FROM poll_votes pv WHERE pv.option_id = po.id AND pv.user_id = p_user_id)
          ELSE false END
        ) ORDER BY po.display_order
      )
      FROM poll_options po
      WHERE po.poll_id = p.id
    ) as options
  FROM polls p
  WHERE p.thread_id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on a poll
CREATE OR REPLACE FUNCTION vote_on_poll(
  p_poll_id uuid,
  p_option_ids uuid[],
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_poll polls%ROWTYPE;
  v_option_id uuid;
BEGIN
  -- Get poll info
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Poll not found');
  END IF;
  
  -- Check if poll is closed
  IF v_poll.is_closed OR (v_poll.ends_at IS NOT NULL AND v_poll.ends_at < now()) THEN
    RETURN json_build_object('success', false, 'error', 'Poll is closed');
  END IF;
  
  -- Check if multiple votes allowed
  IF NOT v_poll.allow_multiple AND array_length(p_option_ids, 1) > 1 THEN
    RETURN json_build_object('success', false, 'error', 'Multiple votes not allowed');
  END IF;
  
  -- Remove existing votes if not allow_multiple
  IF NOT v_poll.allow_multiple THEN
    DELETE FROM poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id;
  END IF;
  
  -- Add votes
  FOREACH v_option_id IN ARRAY p_option_ids
  LOOP
    INSERT INTO poll_votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, v_option_id, p_user_id)
    ON CONFLICT (poll_id, option_id, user_id) DO NOTHING;
  END LOOP;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a poll
CREATE OR REPLACE FUNCTION create_poll(
  p_thread_id uuid,
  p_question text,
  p_options text[],
  p_user_id uuid,
  p_allow_multiple boolean DEFAULT false,
  p_show_results_before_vote boolean DEFAULT false,
  p_ends_at timestamptz DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_poll_id uuid;
  v_option text;
  v_order integer := 0;
BEGIN
  -- Check if thread already has a poll
  IF EXISTS (SELECT 1 FROM polls WHERE thread_id = p_thread_id) THEN
    RETURN json_build_object('success', false, 'error', 'Thread already has a poll');
  END IF;
  
  -- Create poll
  INSERT INTO polls (thread_id, question, created_by, allow_multiple, show_results_before_vote, ends_at)
  VALUES (p_thread_id, p_question, p_user_id, p_allow_multiple, p_show_results_before_vote, p_ends_at)
  RETURNING id INTO v_poll_id;
  
  -- Add options
  FOREACH v_option IN ARRAY p_options
  LOOP
    INSERT INTO poll_options (poll_id, option_text, display_order)
    VALUES (v_poll_id, v_option, v_order);
    v_order := v_order + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'poll_id', v_poll_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- FILE: 20260129220000_reactions_system.sql
-- =============================================
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
  ('like', 'ðŸ‘', 'Me gusta', 1),
  ('love', 'â¤ï¸', 'Me encanta', 2),
  ('laugh', 'ðŸ˜‚', 'Jaja', 3),
  ('wow', 'ðŸ˜®', 'Wow', 4),
  ('sad', 'ðŸ˜¢', 'Triste', 5),
  ('angry', 'ðŸ˜ ', 'Enfadado', 6),
  ('fire', 'ðŸ”¥', 'Fuego', 7),
  ('100', 'ðŸ’¯', 'Perfecto', 8)
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



