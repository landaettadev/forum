-- =====================================================
-- ESCORT PROFILES AND CUSTOM BADGES SYSTEM
-- =====================================================

-- Add is_escort flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_escort BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escort_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escort_verified_by UUID REFERENCES profiles(id);

-- Create custom badges table (manageable by mods)
CREATE TABLE IF NOT EXISTS custom_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'award', -- lucide icon name
  color VARCHAR(20) DEFAULT 'purple', -- tailwind color
  bg_color VARCHAR(20) DEFAULT 'purple',
  badge_type VARCHAR(20) NOT NULL DEFAULT 'positive' CHECK (badge_type IN ('positive', 'negative', 'neutral', 'special')),
  is_active BOOLEAN DEFAULT TRUE,
  can_be_assigned_by VARCHAR(20) DEFAULT 'mod' CHECK (can_be_assigned_by IN ('admin', 'super_mod', 'mod')),
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_custom_badges junction table
CREATE TABLE IF NOT EXISTS user_custom_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES custom_badges(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  expires_at TIMESTAMPTZ, -- NULL = permanent
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, badge_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_custom_badges_user ON user_custom_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_badges_badge ON user_custom_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_custom_badges_type ON custom_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_profiles_escort ON profiles(is_escort) WHERE is_escort = TRUE;

-- Insert default custom badges
INSERT INTO custom_badges (name, display_name, description, icon, color, bg_color, badge_type, can_be_assigned_by, display_order) VALUES
-- Positive badges
('legendary_reviewer', 'Reseñador Legendario', 'Usuario con reseñas de alta calidad y gran reputación', 'crown', 'yellow', 'yellow', 'positive', 'mod', 1),
('trusted_reviewer', 'Reseñador Confiable', 'Usuario verificado con historial de reseñas precisas', 'shield-check', 'green', 'green', 'positive', 'mod', 2),
('top_contributor', 'Top Contribuidor', 'Uno de los usuarios más activos de la comunidad', 'trophy', 'amber', 'amber', 'positive', 'mod', 3),
('expert_reviewer', 'Experto en Reseñas', 'Conocedor experimentado del tema', 'graduation-cap', 'blue', 'blue', 'positive', 'mod', 4),
('helpful_member', 'Miembro Útil', 'Siempre ayuda a otros miembros', 'heart-handshake', 'pink', 'pink', 'positive', 'mod', 5),
('veteran', 'Veterano', 'Miembro de larga data en la comunidad', 'medal', 'slate', 'slate', 'positive', 'mod', 6),

-- Negative/Warning badges
('dubious_reviewer', 'Reseñador Dudoso', 'Reseñas de este usuario deben verificarse', 'alert-triangle', 'orange', 'orange', 'negative', 'mod', 10),
('unreliable', 'No Confiable', 'Historial de información incorrecta o engañosa', 'alert-octagon', 'red', 'red', 'negative', 'mod', 11),
('suspected_fake', 'Sospecha de Fake', 'Posible cuenta falsa o spam', 'user-x', 'red', 'red', 'negative', 'super_mod', 12),
('under_review', 'En Revisión', 'Cuenta bajo revisión por moderadores', 'eye', 'gray', 'gray', 'negative', 'mod', 13),

-- Neutral badges
('new_reviewer', 'Nuevo Reseñador', 'Usuario nuevo, pocas reseñas aún', 'sparkles', 'cyan', 'cyan', 'neutral', 'mod', 20),
('comeback', 'De Vuelta', 'Usuario que ha regresado después de un tiempo', 'rotate-ccw', 'indigo', 'indigo', 'neutral', 'mod', 21),

-- Special badges
('escort_verified', 'Escort Verificada', 'Perfil de escort verificado oficialmente', 'badge-check', 'fuchsia', 'fuchsia', 'special', 'super_mod', 30),
('official_account', 'Cuenta Oficial', 'Cuenta oficial verificada', 'verified', 'blue', 'blue', 'special', 'admin', 31),
('partner', 'Partner', 'Colaborador oficial del sitio', 'handshake', 'emerald', 'emerald', 'special', 'admin', 32),
('premium_escort', 'Escort Premium', 'Escort con membresía premium', 'gem', 'violet', 'violet', 'special', 'admin', 33)
ON CONFLICT (name) DO NOTHING;

-- Function to check if user can assign badge based on role
CREATE OR REPLACE FUNCTION can_assign_badge(
  assigner_role TEXT,
  assigner_mod_type TEXT,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin can assign all
  IF assigner_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Super mod can assign mod and super_mod badges
  IF assigner_mod_type = 'super' AND required_permission IN ('mod', 'super_mod') THEN
    RETURN TRUE;
  END IF;
  
  -- Basic mod can only assign mod badges
  IF assigner_role = 'mod' AND required_permission = 'mod' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark profile as escort
CREATE OR REPLACE FUNCTION set_escort_profile(
  target_user_id UUID,
  verifier_id UUID,
  is_escort_value BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    is_escort = is_escort_value,
    escort_verified_at = CASE WHEN is_escort_value THEN NOW() ELSE NULL END,
    escort_verified_by = CASE WHEN is_escort_value THEN verifier_id ELSE NULL END
  WHERE id = target_user_id;
  
  -- Also assign/remove the escort_verified badge
  IF is_escort_value THEN
    INSERT INTO user_custom_badges (user_id, badge_id, assigned_by, reason)
    SELECT target_user_id, id, verifier_id, 'Perfil de escort verificado'
    FROM custom_badges WHERE name = 'escort_verified'
    ON CONFLICT (user_id, badge_id) DO UPDATE SET is_active = TRUE, assigned_at = NOW();
  ELSE
    UPDATE user_custom_badges 
    SET is_active = FALSE 
    WHERE user_id = target_user_id 
    AND badge_id = (SELECT id FROM custom_badges WHERE name = 'escort_verified');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE custom_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can view badges
DROP POLICY IF EXISTS "Anyone can view custom badges" ON custom_badges;
CREATE POLICY "Anyone can view custom badges" ON custom_badges
  FOR SELECT TO public USING (TRUE);

-- Only admins can manage badge definitions
DROP POLICY IF EXISTS "Admins can manage badges" ON custom_badges;
CREATE POLICY "Admins can manage badges" ON custom_badges
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Everyone can view user badges
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_custom_badges;
CREATE POLICY "Anyone can view user badges" ON user_custom_badges
  FOR SELECT TO public USING (TRUE);

-- Mods can assign badges based on permissions
DROP POLICY IF EXISTS "Mods can assign badges" ON user_custom_badges;
CREATE POLICY "Mods can assign badges" ON user_custom_badges
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p, custom_badges cb
      WHERE p.id = auth.uid() 
      AND cb.id = badge_id
      AND can_assign_badge(p.role, p.moderator_type, cb.can_be_assigned_by)
    )
  );

-- Mods can update badge assignments
DROP POLICY IF EXISTS "Mods can update badge assignments" ON user_custom_badges;
CREATE POLICY "Mods can update badge assignments" ON user_custom_badges
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.role IN ('admin', 'mod') OR p.moderator_type IS NOT NULL)
    )
  );

-- Admins can delete badge assignments
DROP POLICY IF EXISTS "Admins can delete badge assignments" ON user_custom_badges;
CREATE POLICY "Admins can delete badge assignments" ON user_custom_badges
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
