-- =============================================
-- SISTEMA DE BANNERS PUBLICITARIOS
-- =============================================

-- Zonas publicitarias (cada país = zona home+país, cada región = zona ciudad independiente)
CREATE TABLE IF NOT EXISTS banner_ad_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('home_country', 'city')),
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- home_country zones: country_id NOT NULL, region_id NULL
  -- city zones: country_id NOT NULL, region_id NOT NULL
  UNIQUE(zone_type, country_id, region_id)
);

-- Bookings de banners (solicitudes de compra de espacio)
CREATE TABLE IF NOT EXISTS banner_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES banner_ad_zones(id) ON DELETE CASCADE,

  -- Posición y formato
  position VARCHAR(20) NOT NULL CHECK (position IN ('header', 'sidebar_top', 'sidebar_bottom', 'footer', 'content')),
  format VARCHAR(10) NOT NULL CHECK (format IN ('728x90', '300x250')),

  -- Contenido del banner
  image_url TEXT,
  click_url TEXT,

  -- Fechas y duración
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 15, 30, 90, 180)),

  -- Precio
  price_usd NUMERIC(10,2) NOT NULL,

  -- Estado y moderación
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'expired', 'cancelled')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Códigos de fallback del admin (publicidad de terceros tipo JuicyAds)
CREATE TABLE IF NOT EXISTS banner_fallbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES banner_ad_zones(id) ON DELETE CASCADE, -- NULL = fallback global
  position VARCHAR(20) NOT NULL CHECK (position IN ('header', 'sidebar_top', 'sidebar_bottom', 'footer', 'content')),
  format VARCHAR(10) NOT NULL CHECK (format IN ('728x90', '300x250')),
  code_html TEXT NOT NULL, -- JS/HTML de la red publicitaria
  label VARCHAR(100), -- Nombre descriptivo para el admin
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Mayor prioridad = se muestra primero
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics: impresiones y clicks de banners
CREATE TABLE IF NOT EXISTS banner_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES banner_bookings(id) ON DELETE SET NULL,
  fallback_id UUID REFERENCES banner_fallbacks(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES banner_ad_zones(id) ON DELETE SET NULL,
  position VARCHAR(20),
  event_type VARCHAR(15) NOT NULL CHECK (event_type IN ('impression', 'click')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_banner_zones_type ON banner_ad_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_banner_zones_country ON banner_ad_zones(country_id);
CREATE INDEX IF NOT EXISTS idx_banner_zones_region ON banner_ad_zones(region_id);

CREATE INDEX IF NOT EXISTS idx_banner_bookings_user ON banner_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_zone ON banner_bookings(zone_id);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_status ON banner_bookings(status);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_dates ON banner_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_banner_bookings_active ON banner_bookings(zone_id, position, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_banner_fallbacks_zone ON banner_fallbacks(zone_id);
CREATE INDEX IF NOT EXISTS idx_banner_fallbacks_active ON banner_fallbacks(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_banner_impressions_booking ON banner_impressions(booking_id);
CREATE INDEX IF NOT EXISTS idx_banner_impressions_created ON banner_impressions(created_at);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE banner_ad_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_fallbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_impressions ENABLE ROW LEVEL SECURITY;

-- Zonas: visibles para todos (lectura), solo admin puede modificar
CREATE POLICY "Zonas visibles para todos" ON banner_ad_zones
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modifica zonas" ON banner_ad_zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Bookings: usuarios ven los suyos + bookings activos, crean los suyos, admin ve/edita todo
CREATE POLICY "Ver bookings propios y activos" ON banner_bookings
  FOR SELECT USING (
    user_id = auth.uid()
    OR status = 'active'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod'))
  );

CREATE POLICY "Usuarios crean bookings" ON banner_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin y propietario editan bookings" ON banner_bookings
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "Admin elimina bookings" ON banner_bookings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Fallbacks: visibles para renderizado, solo admin gestiona
CREATE POLICY "Fallbacks visibles para renderizado" ON banner_fallbacks
  FOR SELECT USING (true);

CREATE POLICY "Solo admin gestiona fallbacks" ON banner_fallbacks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Impressions: cualquiera inserta (tracking), solo admin lee
CREATE POLICY "Insertar impresiones" ON banner_impressions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin lee impresiones" ON banner_impressions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- =============================================
-- FUNCIONES RPC
-- =============================================

-- Obtener el banner activo para una zona + posición + fecha
CREATE OR REPLACE FUNCTION get_active_banner(
  p_zone_id UUID,
  p_position VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  booking_id UUID,
  image_url TEXT,
  click_url TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bb.id AS booking_id,
    bb.image_url,
    bb.click_url,
    bb.user_id
  FROM banner_bookings bb
  WHERE bb.zone_id = p_zone_id
    AND bb.position = p_position
    AND bb.status = 'active'
    AND p_date >= bb.start_date
    AND p_date <= bb.end_date
  ORDER BY bb.start_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener el código de fallback para una zona + posición
CREATE OR REPLACE FUNCTION get_banner_fallback(
  p_zone_id UUID,
  p_position VARCHAR,
  p_format VARCHAR
)
RETURNS TABLE (
  fallback_id UUID,
  code_html TEXT
) AS $$
BEGIN
  -- Primero buscar fallback específico de la zona
  RETURN QUERY
  SELECT bf.id AS fallback_id, bf.code_html
  FROM banner_fallbacks bf
  WHERE bf.is_active = true
    AND bf.position = p_position
    AND bf.format = p_format
    AND (bf.zone_id = p_zone_id OR bf.zone_id IS NULL)
  ORDER BY
    CASE WHEN bf.zone_id IS NOT NULL THEN 0 ELSE 1 END, -- zona específica primero
    bf.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar disponibilidad de un slot en un rango de fechas
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_zone_id UUID,
  p_position VARCHAR,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM banner_bookings
  WHERE zone_id = p_zone_id
    AND position = p_position
    AND status IN ('approved', 'active')
    AND start_date < p_end_date
    AND end_date > p_start_date
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener días ocupados para un slot en un rango
CREATE OR REPLACE FUNCTION get_occupied_dates(
  p_zone_id UUID,
  p_position VARCHAR,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT (CURRENT_DATE + INTERVAL '365 days')::DATE
)
RETURNS TABLE (
  booking_id UUID,
  start_date DATE,
  end_date DATE,
  username VARCHAR,
  avatar_url TEXT,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bb.id AS booking_id,
    bb.start_date,
    bb.end_date,
    p.username,
    p.avatar_url,
    bb.status
  FROM banner_bookings bb
  JOIN profiles p ON p.id = bb.user_id
  WHERE bb.zone_id = p_zone_id
    AND bb.position = p_position
    AND bb.status IN ('approved', 'active', 'pending')
    AND bb.start_date <= p_to_date
    AND bb.end_date >= p_from_date
  ORDER BY bb.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activar bookings aprobados cuya fecha de inicio es hoy
CREATE OR REPLACE FUNCTION activate_due_bookings()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE banner_bookings
  SET status = 'active', updated_at = NOW()
  WHERE status = 'approved'
    AND start_date <= CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Expirar bookings activos cuya fecha de fin pasó
  UPDATE banner_bookings
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generar zonas publicitarias para todos los países y regiones existentes
CREATE OR REPLACE FUNCTION seed_banner_zones()
RETURNS void AS $$
BEGIN
  -- Crear zonas home_country para cada país
  INSERT INTO banner_ad_zones (zone_type, country_id, region_id, name)
  SELECT 'home_country', c.id, NULL, 'Home + ' || c.name
  FROM countries c
  ON CONFLICT (zone_type, country_id, region_id) DO NOTHING;

  -- Crear zonas city para cada región
  INSERT INTO banner_ad_zones (zone_type, country_id, region_id, name)
  SELECT 'city', r.country_id, r.id, r.name
  FROM regions r
  ON CONFLICT (zone_type, country_id, region_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar seed inicial
SELECT seed_banner_zones();
