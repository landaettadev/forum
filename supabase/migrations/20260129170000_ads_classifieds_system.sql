-- =============================================
-- SISTEMA DE ANUNCIOS/CLASIFICADOS PARA ESCORTS
-- =============================================

-- Tabla principal de anuncios
CREATE TABLE IF NOT EXISTS escort_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Información básica
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Ubicación
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
  
  -- Características físicas
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
  
  -- Estado y moderación
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'rejected', 'expired')),
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false, -- Anuncio destacado (VIP)
  is_vip BOOLEAN DEFAULT false,
  
  -- Estadísticas
  views_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0, -- Veces que mostraron el contacto
  favorites_count INTEGER DEFAULT 0,
  
  -- Fechas
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_bump_at TIMESTAMPTZ, -- Última vez que subió el anuncio
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
  is_verified BOOLEAN DEFAULT false, -- Foto verificada por moderación
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

-- Historial de vistas de anuncios (para estadísticas)
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

-- Índices para mejor rendimiento
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

-- escort_services es una tabla de catálogo de solo lectura
CREATE POLICY "Servicios visibles para todos" ON escort_services
  FOR SELECT USING (true);

-- Políticas para escort_ads
CREATE POLICY "Anuncios activos visibles para todos" ON escort_ads
  FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear sus anuncios" ON escort_ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden editar sus anuncios" ON escort_ads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus anuncios" ON escort_ads
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para fotos
CREATE POLICY "Fotos visibles si el anuncio es visible" ON escort_ad_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM escort_ads WHERE id = ad_id AND (status = 'active' OR user_id = auth.uid()))
  );

CREATE POLICY "Usuarios pueden gestionar fotos de sus anuncios" ON escort_ad_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM escort_ads WHERE id = ad_id AND user_id = auth.uid())
  );

-- Políticas para favoritos
CREATE POLICY "Usuarios ven sus favoritos" ON escort_ad_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden gestionar sus favoritos" ON escort_ad_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para alertas
CREATE POLICY "Usuarios ven sus alertas" ON zone_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden gestionar sus alertas" ON zone_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para vistas (insertar sin autenticación para tracking)
CREATE POLICY "Cualquiera puede registrar vistas" ON escort_ad_views
  FOR INSERT WITH CHECK (true);

-- Función para incrementar vistas
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

-- Función para toggle favorito de anuncio
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

-- Función para notificar nuevos anuncios en zonas con alertas
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
      -- Crear notificación
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_alert.user_id,
        'new_ad_in_zone',
        'Nuevo anuncio en tu zona',
        'Se ha publicado un nuevo anuncio que podría interesarte',
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

-- Añadir campo para IP del usuario en profiles (para geolocalización)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS detected_country_id UUID REFERENCES countries(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ip INET;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_country_id UUID REFERENCES countries(id);
