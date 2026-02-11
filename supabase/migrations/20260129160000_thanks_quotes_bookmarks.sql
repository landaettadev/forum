-- =============================================
-- FASE 1: Interacción Básica
-- Thanks, Quotes, Bookmarks
-- =============================================

-- =============================================
-- 1.1 SISTEMA DE GRACIAS (THANKS)
-- =============================================

-- Tabla para registrar los agradecimientos
CREATE TABLE IF NOT EXISTS post_thanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Un usuario solo puede agradecer una vez por post
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_post_thanks_post_id ON post_thanks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_thanks_user_id ON post_thanks(user_id);

-- Función para agradecer un post
CREATE OR REPLACE FUNCTION thank_post(p_post_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_post_author_id UUID;
  v_already_thanked BOOLEAN;
  v_thanks_count INT;
BEGIN
  -- Obtener el autor del post
  SELECT author_id INTO v_post_author_id FROM posts WHERE id = p_post_id;
  
  -- No permitir auto-agradecimiento
  IF v_post_author_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_thank_own_post');
  END IF;
  
  -- Verificar si ya agradeció
  SELECT EXISTS(
    SELECT 1 FROM post_thanks WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_already_thanked;
  
  IF v_already_thanked THEN
    -- Quitar agradecimiento
    DELETE FROM post_thanks WHERE post_id = p_post_id AND user_id = p_user_id;
    
    -- Decrementar contador del autor
    UPDATE profiles 
    SET thanks_received = GREATEST(0, thanks_received - 1),
        points = GREATEST(0, points - 3)
    WHERE id = v_post_author_id;
    
    SELECT COUNT(*) INTO v_thanks_count FROM post_thanks WHERE post_id = p_post_id;
    
    RETURN jsonb_build_object('success', true, 'action', 'unthanked', 'thanks_count', v_thanks_count);
  ELSE
    -- Agregar agradecimiento
    INSERT INTO post_thanks (post_id, user_id) VALUES (p_post_id, p_user_id);
    
    -- Incrementar contador del autor
    UPDATE profiles 
    SET thanks_received = thanks_received + 1,
        points = points + 3
    WHERE id = v_post_author_id;
    
    SELECT COUNT(*) INTO v_thanks_count FROM post_thanks WHERE post_id = p_post_id;
    
    RETURN jsonb_build_object('success', true, 'action', 'thanked', 'thanks_count', v_thanks_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para post_thanks
ALTER TABLE post_thanks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view thanks" ON post_thanks;
CREATE POLICY "Anyone can view thanks" ON post_thanks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can thank" ON post_thanks;
CREATE POLICY "Authenticated users can thank" ON post_thanks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their thanks" ON post_thanks;
CREATE POLICY "Users can remove their thanks" ON post_thanks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 1.2 SISTEMA DE CITAS (QUOTES)
-- No necesita tabla, se almacena en el contenido del post
-- Solo añadimos un campo para referenciar posts citados
-- =============================================

-- Añadir campo para citas en posts (JSON array de post IDs citados)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS quoted_posts UUID[] DEFAULT '{}';

-- =============================================
-- 1.3 SISTEMA DE FAVORITOS (BOOKMARKS)
-- =============================================

-- Tabla de favoritos de hilos
CREATE TABLE IF NOT EXISTS thread_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_name VARCHAR(100) DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_thread_bookmarks_user_id ON thread_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_bookmarks_thread_id ON thread_bookmarks(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_bookmarks_folder ON thread_bookmarks(user_id, folder_name);

-- Tabla de favoritos de posts específicos
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_name VARCHAR(100) DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON post_bookmarks(post_id);

-- Función para toggle bookmark de hilo
CREATE OR REPLACE FUNCTION toggle_thread_bookmark(
  p_thread_id UUID, 
  p_user_id UUID,
  p_folder_name VARCHAR DEFAULT 'General',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_is_bookmarked BOOLEAN;
BEGIN
  -- Verificar si ya existe
  SELECT id INTO v_existing_id 
  FROM thread_bookmarks 
  WHERE thread_id = p_thread_id AND user_id = p_user_id;
  
  IF v_existing_id IS NOT NULL THEN
    -- Quitar favorito
    DELETE FROM thread_bookmarks WHERE id = v_existing_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'bookmarked', false);
  ELSE
    -- Añadir favorito
    INSERT INTO thread_bookmarks (thread_id, user_id, folder_name, notes)
    VALUES (p_thread_id, p_user_id, p_folder_name, p_notes);
    RETURN jsonb_build_object('success', true, 'action', 'added', 'bookmarked', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para toggle bookmark de post
CREATE OR REPLACE FUNCTION toggle_post_bookmark(
  p_post_id UUID, 
  p_user_id UUID,
  p_folder_name VARCHAR DEFAULT 'General',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id 
  FROM post_bookmarks 
  WHERE post_id = p_post_id AND user_id = p_user_id;
  
  IF v_existing_id IS NOT NULL THEN
    DELETE FROM post_bookmarks WHERE id = v_existing_id;
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'bookmarked', false);
  ELSE
    INSERT INTO post_bookmarks (post_id, user_id, folder_name, notes)
    VALUES (p_post_id, p_user_id, p_folder_name, p_notes);
    RETURN jsonb_build_object('success', true, 'action', 'added', 'bookmarked', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para thread_bookmarks
ALTER TABLE thread_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can view own bookmarks" ON thread_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can create bookmarks" ON thread_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can update own bookmarks" ON thread_bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON thread_bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON thread_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS para post_bookmarks
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can view own post bookmarks" ON post_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can create post bookmarks" ON post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can update own post bookmarks" ON post_bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post bookmarks" ON post_bookmarks;
CREATE POLICY "Users can delete own post bookmarks" ON post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Vista para obtener bookmarks con info del hilo
-- =============================================
DROP VIEW IF EXISTS user_thread_bookmarks_view;
CREATE VIEW user_thread_bookmarks_view WITH (security_invoker = true) AS
SELECT 
  tb.id,
  tb.user_id,
  tb.folder_name,
  tb.notes,
  tb.created_at as bookmarked_at,
  t.id as thread_id,
  t.title,
  t.created_at as thread_created_at,
  t.replies_count,
  t.views_count,
  t.is_pinned,
  t.is_locked,
  f.name as category_name,
  f.slug as category_slug,
  p.username as author_username,
  p.avatar_url as author_avatar
FROM thread_bookmarks tb
JOIN threads t ON tb.thread_id = t.id
JOIN forums f ON t.forum_id = f.id
JOIN profiles p ON t.author_id = p.id;
