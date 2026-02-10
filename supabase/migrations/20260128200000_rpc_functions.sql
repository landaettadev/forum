-- =============================================
-- Funciones RPC para operaciones comunes
-- =============================================

-- Función para incrementar un contador en cualquier tabla
CREATE OR REPLACE FUNCTION increment(row_id UUID, column_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1', 
    TG_TABLE_NAME, column_name, column_name)
  USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para decrementar un contador
CREATE OR REPLACE FUNCTION decrement(row_id UUID, column_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = GREATEST(COALESCE(%I, 0) - 1, 0) WHERE id = $1', 
    TG_TABLE_NAME, column_name, column_name)
  USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar posts de usuario
CREATE OR REPLACE FUNCTION increment_user_posts(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET posts_count = COALESCE(posts_count, 0) + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para decrementar posts de usuario
CREATE OR REPLACE FUNCTION decrement_user_posts(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET posts_count = GREATEST(COALESCE(posts_count, 0) - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar vistas de hilo
CREATE OR REPLACE FUNCTION increment_thread_views(thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE threads 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar respuestas de hilo
CREATE OR REPLACE FUNCTION increment_thread_replies(thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE threads 
  SET replies_count = COALESCE(replies_count, 0) + 1 
  WHERE id = thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar último post del hilo
CREATE OR REPLACE FUNCTION update_thread_last_post(
  p_thread_id UUID, 
  p_post_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE threads 
  SET 
    last_post_id = p_post_id, 
    last_post_at = NOW(),
    replies_count = COALESCE(replies_count, 0) + 1
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar thanks recibidos
CREATE OR REPLACE FUNCTION increment_thanks_received(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET thanks_received = COALESCE(thanks_received, 0) + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar seguidores
CREATE OR REPLACE FUNCTION increment_followers(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET followers_count = COALESCE(followers_count, 0) + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para decrementar seguidores
CREATE OR REPLACE FUNCTION decrement_followers(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar following
CREATE OR REPLACE FUNCTION increment_following(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET following_count = COALESCE(following_count, 0) + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para decrementar following
CREATE OR REPLACE FUNCTION decrement_following(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas del foro
CREATE OR REPLACE FUNCTION get_forum_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles WHERE is_deleted = false),
    'total_threads', (SELECT COUNT(*) FROM threads WHERE is_deleted = false),
    'total_posts', (SELECT COUNT(*) FROM posts WHERE is_deleted = false),
    'online_users', (SELECT COUNT(*) FROM profiles WHERE last_seen_at > NOW() - INTERVAL '15 minutes'),
    'newest_user', (SELECT username FROM profiles ORDER BY created_at DESC LIMIT 1)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar posts_count en profiles cuando se crea un post
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET posts_count = COALESCE(posts_count, 0) + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET posts_count = GREATEST(COALESCE(posts_count, 0) - 1, 0) WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS posts_count_trigger ON posts;
CREATE TRIGGER posts_count_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_posts_count();

-- Trigger para actualizar replies_count en threads
CREATE OR REPLACE FUNCTION update_thread_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_first_post THEN
    UPDATE threads 
    SET 
      replies_count = COALESCE(replies_count, 0) + 1,
      last_post_id = NEW.id,
      last_post_at = NEW.created_at
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_first_post THEN
    UPDATE threads 
    SET replies_count = GREATEST(COALESCE(replies_count, 0) - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS thread_replies_trigger ON posts;
CREATE TRIGGER thread_replies_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_replies_count();

-- Trigger para actualizar thanks_count en posts y thanks_received en profiles
CREATE OR REPLACE FUNCTION update_thanks_count()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar thanks_count en el post
    UPDATE posts SET thanks_count = COALESCE(thanks_count, 0) + 1 WHERE id = NEW.post_id;
    
    -- Obtener author_id del post e incrementar thanks_received
    SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
    IF post_author_id IS NOT NULL THEN
      UPDATE profiles SET thanks_received = COALESCE(thanks_received, 0) + 1 WHERE id = post_author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar thanks_count en el post
    UPDATE posts SET thanks_count = GREATEST(COALESCE(thanks_count, 0) - 1, 0) WHERE id = OLD.post_id;
    
    -- Obtener author_id del post y decrementar thanks_received
    SELECT author_id INTO post_author_id FROM posts WHERE id = OLD.post_id;
    IF post_author_id IS NOT NULL THEN
      UPDATE profiles SET thanks_received = GREATEST(COALESCE(thanks_received, 0) - 1, 0) WHERE id = post_author_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS thanks_count_trigger ON thanks;
CREATE TRIGGER thanks_count_trigger
  AFTER INSERT OR DELETE ON thanks
  FOR EACH ROW
  EXECUTE FUNCTION update_thanks_count();

-- Trigger para actualizar followers_count y following_count
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar followers del seguido
    UPDATE profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = NEW.following_id;
    -- Incrementar following del seguidor
    UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar followers del seguido
    UPDATE profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE id = OLD.following_id;
    -- Decrementar following del seguidor
    UPDATE profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS follow_counts_trigger ON user_followers;
CREATE TRIGGER follow_counts_trigger
  AFTER INSERT OR DELETE ON user_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- Comentarios
COMMENT ON FUNCTION increment_user_posts IS 'Incrementa el contador de posts de un usuario';
COMMENT ON FUNCTION increment_thread_views IS 'Incrementa el contador de vistas de un hilo';
COMMENT ON FUNCTION get_forum_stats IS 'Obtiene estadísticas generales del foro';
