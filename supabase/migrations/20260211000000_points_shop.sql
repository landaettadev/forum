-- Points Shop: users can spend reputation on perks
-- ================================================

-- Shop items catalog
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL CHECK (cost > 0),
  category TEXT NOT NULL DEFAULT 'cosmetic', -- cosmetic, boost, feature
  icon_emoji TEXT DEFAULT '🎁',
  is_active BOOLEAN DEFAULT true,
  duration_hours INTEGER, -- NULL = permanent, otherwise temporary
  max_per_user INTEGER, -- NULL = unlimited
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User purchases
CREATE TABLE IF NOT EXISTS shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  cost INTEGER NOT NULL,
  expires_at TIMESTAMPTZ, -- NULL = permanent
  target_id UUID, -- thread_id for boost, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON shop_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_active ON shop_purchases(user_id, expires_at);

-- Seed default shop items
INSERT INTO shop_items (slug, name, description, cost, category, icon_emoji, duration_hours) VALUES
  ('highlight_thread_24h', 'Destacar hilo 24h', 'Tu hilo aparecerá resaltado en la lista durante 24 horas', 50, 'boost', '⭐', 24),
  ('highlight_thread_72h', 'Destacar hilo 72h', 'Tu hilo aparecerá resaltado en la lista durante 72 horas', 120, 'boost', '🌟', 72),
  ('custom_name_color', 'Color de nombre personalizado', 'Cambia el color de tu nombre de usuario por 30 días', 200, 'cosmetic', '🎨', 720),
  ('exclusive_sticker_pack', 'Pack de stickers exclusivos', 'Desbloquea stickers premium para usar en tus posts', 100, 'cosmetic', '🏷️', NULL),
  ('pin_post_in_thread', 'Fijar tu post en hilo', 'Tu post se fijará arriba del hilo por 48 horas', 75, 'boost', '📌', 48),
  ('vip_badge_30d', 'Insignia VIP 30 días', 'Obtén la insignia VIP dorada junto a tu nombre', 300, 'feature', '👑', 720),
  ('extra_image_uploads', 'Imágenes extra', 'Sube hasta 10 imágenes por post (en vez de 3) por 30 días', 150, 'feature', '🖼️', 720)
ON CONFLICT (slug) DO NOTHING;

-- Function to purchase an item
CREATE OR REPLACE FUNCTION purchase_shop_item(
  p_user_id UUID,
  p_item_slug TEXT,
  p_target_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_item shop_items%ROWTYPE;
  v_balance INTEGER;
  v_purchase_count INTEGER;
  v_purchase_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get item
  SELECT * INTO v_item FROM shop_items WHERE slug = p_item_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or inactive');
  END IF;

  -- Get user balance (reputation_score from profiles)
  SELECT COALESCE(reputation_score, 0) INTO v_balance FROM profiles WHERE id = p_user_id;
  IF v_balance < v_item.cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient reputation points', 'balance', v_balance, 'cost', v_item.cost);
  END IF;

  -- Check max per user
  IF v_item.max_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_purchase_count
    FROM shop_purchases
    WHERE user_id = p_user_id AND item_id = v_item.id
      AND (expires_at IS NULL OR expires_at > now());
    IF v_purchase_count >= v_item.max_per_user THEN
      RETURN jsonb_build_object('success', false, 'error', 'Max purchases reached for this item');
    END IF;
  END IF;

  -- Calculate expiry
  IF v_item.duration_hours IS NOT NULL THEN
    v_expires_at := now() + (v_item.duration_hours || ' hours')::INTERVAL;
  END IF;

  -- Deduct points
  UPDATE profiles SET reputation_score = reputation_score - v_item.cost WHERE id = p_user_id;

  -- Create purchase
  INSERT INTO shop_purchases (user_id, item_id, cost, expires_at, target_id)
  VALUES (p_user_id, v_item.id, v_item.cost, v_expires_at, p_target_id)
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object('success', true, 'purchase_id', v_purchase_id, 'remaining_balance', v_balance - v_item.cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
