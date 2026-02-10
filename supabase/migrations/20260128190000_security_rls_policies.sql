-- =============================================
-- CRITICAL SECURITY: Row Level Security Policies
-- =============================================
-- Esta migración añade políticas RLS faltantes identificadas en auditoría de seguridad
-- Fecha: 28 de enero de 2026

-- =============================================
-- 1. NOTIFICATIONS TABLE - CRÍTICO
-- =============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Sistema/Usuarios pueden crear notificaciones
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuarios pueden actualizar solo sus propias notificaciones (marcar como leído)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- 2. REPORTS TABLE - CRÍTICO
-- =============================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Moderadores y admins pueden ver todos los reportes
CREATE POLICY "Moderators can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Usuarios pueden ver sus propios reportes creados
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Usuarios autenticados pueden crear reportes
CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Solo moderadores pueden actualizar reportes (resolver, revisar)
CREATE POLICY "Moderators can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- =============================================
-- 3. MODERATION_LOGS TABLE - CRÍTICO
-- =============================================

ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Solo moderadores y admins pueden ver logs
CREATE POLICY "Only moderators can view logs"
  ON moderation_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Solo moderadores pueden crear logs
CREATE POLICY "Only moderators can create logs"
  ON moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Los logs no se deben poder actualizar ni eliminar (registro permanente)
-- No se agregan políticas UPDATE/DELETE intencionalmente

-- =============================================
-- 4. MEDIA_GALLERY TABLE - CRÍTICO
-- =============================================

ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;

-- Media aprobada es públicamente visible
CREATE POLICY "Approved media is publicly viewable"
  ON media_gallery FOR SELECT
  TO public
  USING (is_approved = true);

-- Usuarios pueden ver su propia media (incluso no aprobada)
CREATE POLICY "Users can view own media"
  ON media_gallery FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Moderadores pueden ver toda la media
CREATE POLICY "Moderators can view all media"
  ON media_gallery FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Usuarios autenticados pueden subir media
CREATE POLICY "Authenticated users can upload media"
  ON media_gallery FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar su propia media
CREATE POLICY "Users can update own media"
  ON media_gallery FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Moderadores pueden actualizar cualquier media (aprobar/rechazar)
CREATE POLICY "Moderators can update any media"
  ON media_gallery FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Usuarios pueden eliminar su propia media
CREATE POLICY "Users can delete own media"
  ON media_gallery FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Moderadores pueden eliminar cualquier media
CREATE POLICY "Moderators can delete any media"
  ON media_gallery FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- =============================================
-- 5. USER_SUSPENSIONS TABLE
-- =============================================

ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- Usuarios suspendidos pueden ver sus propias suspensiones
CREATE POLICY "Users can view own suspensions"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Moderadores pueden ver todas las suspensiones
CREATE POLICY "Moderators can view all suspensions"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Solo moderadores pueden crear suspensiones
CREATE POLICY "Only moderators can create suspensions"
  ON user_suspensions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Solo moderadores pueden actualizar suspensiones (levantar, modificar)
CREATE POLICY "Only moderators can update suspensions"
  ON user_suspensions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- =============================================
-- 6. CHAT_MESSAGES TABLE
-- =============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver mensajes donde son emisor o receptor
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Usuarios pueden enviar mensajes
CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Receptores pueden marcar mensajes como leídos
CREATE POLICY "Receivers can update messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Usuarios pueden eliminar mensajes donde participan
CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- =============================================
-- 7. USER_FOLLOWERS TABLE
-- =============================================

ALTER TABLE user_followers ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver relaciones de seguimiento (públicas)
CREATE POLICY "Followers are publicly viewable"
  ON user_followers FOR SELECT
  TO public
  USING (true);

-- Usuarios pueden seguir a otros
CREATE POLICY "Users can follow others"
  ON user_followers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Usuarios pueden dejar de seguir
CREATE POLICY "Users can unfollow"
  ON user_followers FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- =============================================
-- 8. USER_BLOCKS TABLE
-- =============================================

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Usuarios solo pueden ver sus propios bloqueos
CREATE POLICY "Users can view own blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Usuarios pueden bloquear a otros
CREATE POLICY "Users can block others"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Usuarios pueden desbloquear
CREATE POLICY "Users can unblock"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- =============================================
-- 9. USER_IPS TABLE
-- =============================================

ALTER TABLE user_ips ENABLE ROW LEVEL SECURITY;

-- Solo moderadores y admins pueden ver IPs
CREATE POLICY "Only moderators can view IPs"
  ON user_ips FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Sistema puede registrar IPs
CREATE POLICY "System can log IPs"
  ON user_ips FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- 10. PROFILE_POSTS TABLE (wall posts)
-- =============================================

ALTER TABLE profile_posts ENABLE ROW LEVEL SECURITY;

-- Posts en perfiles son públicamente visibles
CREATE POLICY "Profile posts are publicly viewable"
  ON profile_posts FOR SELECT
  TO public
  USING (true);

-- Usuarios autenticados pueden crear posts en perfiles
CREATE POLICY "Authenticated users can create profile posts"
  ON profile_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Autores pueden actualizar sus propios posts
CREATE POLICY "Authors can update own profile posts"
  ON profile_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = profile_id)
  WITH CHECK (auth.uid() = author_id OR auth.uid() = profile_id);

-- Autores y dueños del perfil pueden eliminar posts
CREATE POLICY "Authors and profile owners can delete posts"
  ON profile_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = profile_id OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- =============================================
-- 11. CONTINENTS, COUNTRIES, REGIONS (Geographic)
-- =============================================

ALTER TABLE continents ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Datos geográficos son públicamente visibles
CREATE POLICY "Continents are publicly viewable"
  ON continents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Countries are publicly viewable"
  ON countries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Regions are publicly viewable"
  ON regions FOR SELECT
  TO public
  USING (true);

-- Solo admins pueden gestionar datos geográficos
CREATE POLICY "Only admins can manage continents"
  ON continents FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can manage countries"
  ON countries FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can manage regions"
  ON regions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- =============================================

-- Índice para mejorar queries de notificaciones no leídas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE is_read = FALSE;

-- Índice para mejorar queries de reportes pendientes
CREATE INDEX IF NOT EXISTS idx_reports_pending 
  ON reports(created_at DESC) 
  WHERE status = 'pending';

-- Índice para mejorar queries de media por aprobar
CREATE INDEX IF NOT EXISTS idx_media_pending_approval 
  ON media_gallery(created_at DESC) 
  WHERE is_approved = FALSE;

-- =============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE notifications IS 'Notificaciones de usuarios con RLS habilitado - solo visibles para el propietario';
COMMENT ON TABLE reports IS 'Reportes de moderación - visibles solo para moderadores y el reportador';
COMMENT ON TABLE moderation_logs IS 'Logs de acciones de moderación - solo visibles para moderadores/admins';
COMMENT ON TABLE media_gallery IS 'Galería multimedia con aprobación - contenido NSFW controlado';
COMMENT ON TABLE user_suspensions IS 'Suspensiones de usuarios - visibles para el usuario y moderadores';
COMMENT ON TABLE user_ips IS 'Tracking de IPs - solo visible para moderadores';

-- =============================================
-- FINALIZACIÓN
-- =============================================

-- Verificar que todas las tablas críticas tienen RLS
DO $$
DECLARE
  table_name TEXT;
  has_rls BOOLEAN;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'notifications', 'reports', 'moderation_logs', 'media_gallery',
      'user_suspensions', 'chat_messages', 'user_followers', 'user_blocks',
      'user_ips', 'profile_posts', 'continents', 'countries', 'regions'
    ])
  LOOP
    SELECT relrowsecurity INTO has_rls
    FROM pg_class
    WHERE relname = table_name;
    
    IF NOT has_rls THEN
      RAISE NOTICE 'ADVERTENCIA: La tabla % no tiene RLS habilitado', table_name;
    ELSE
      RAISE NOTICE 'OK: La tabla % tiene RLS habilitado correctamente', table_name;
    END IF;
  END LOOP;
END $$;
