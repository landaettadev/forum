-- =============================================
-- SISTEMA DE PAGOS Y FACTURACIÓN
-- =============================================

-- Métodos de pago disponibles (configurables por admin)
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  instructions TEXT, -- Instrucciones para el usuario (ej: datos bancarios, dirección crypto)
  icon VARCHAR(50), -- Nombre del ícono (lucide)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar métodos de pago por defecto
INSERT INTO payment_methods (id, label, description, instructions, icon, is_active, display_order) VALUES
  ('bank_transfer', 'Transferencia bancaria', 'Pago mediante transferencia bancaria', 'Realiza la transferencia al siguiente número de cuenta y envía el comprobante.', 'Building2', true, 1),
  ('crypto', 'Criptomonedas', 'Pago con Bitcoin, USDT u otra criptomoneda', 'Envía el monto exacto a la dirección indicada y adjunta el hash de la transacción.', 'Bitcoin', true, 2),
  ('paypal', 'PayPal', 'Pago mediante PayPal', 'Envía el pago a la cuenta PayPal indicada y adjunta el comprobante.', 'Wallet', true, 3),
  ('other', 'Otro método', 'Contacta al administrador para coordinar el pago', 'Escríbenos para coordinar un método de pago alternativo.', 'MessageCircle', true, 4)
ON CONFLICT (id) DO NOTHING;

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  booking_id UUID NOT NULL REFERENCES banner_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Detalles del pago
  amount_usd NUMERIC(10,2) NOT NULL,
  payment_method TEXT REFERENCES payment_methods(id),
  
  -- Estado: pending (esperando pago), submitted (usuario dice que pagó), 
  -- confirmed (admin confirma), rejected (admin rechaza), refunded, cancelled
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'confirmed', 'rejected', 'refunded', 'cancelled'
  )),
  
  -- Comprobante del usuario
  proof_url TEXT,           -- URL del comprobante (imagen/PDF)
  proof_notes TEXT,         -- Notas del usuario (ej: hash de transacción, referencia)
  submitted_at TIMESTAMPTZ, -- Cuándo envió el comprobante
  
  -- Revisión del admin
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Referencia única legible
  reference_code VARCHAR(20) NOT NULL UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de facturas (se genera tras confirmar pago)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Número de factura secuencial
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  
  -- Datos de la factura
  amount_usd NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  
  -- Datos del comprador (snapshot al momento de la factura)
  buyer_username VARCHAR(100),
  buyer_email VARCHAR(255),
  
  -- Datos del servicio
  service_type VARCHAR(50) DEFAULT 'banner_ad',
  service_details JSONB, -- Detalles serializados: zona, posición, fechas, etc.
  
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_code);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Payment methods: visibles para todos
CREATE POLICY "Anyone can view payment methods" ON payment_methods
  FOR SELECT USING (true);

CREATE POLICY "Admin manages payment methods" ON payment_methods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments: usuario ve los suyos, admin ve todos
CREATE POLICY "Users view own payments" ON payments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod'))
  );

CREATE POLICY "Users create own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can submit proof" ON payments
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invoices: usuario ve las suyas, admin ve todas
CREATE POLICY "Users view own invoices" ON invoices
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod'))
  );

CREATE POLICY "System creates invoices" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = user_id
  );

-- =============================================
-- FUNCIONES
-- =============================================

-- Generar código de referencia único
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TEXT AS $$
DECLARE
  v_ref TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_ref := 'TF-' || TO_CHAR(NOW(), 'YYMM') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM payments WHERE reference_code = v_ref) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

-- Generar número de factura secuencial
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || v_year || '-%';
  
  RETURN 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Confirmar pago y activar booking
CREATE OR REPLACE FUNCTION confirm_payment(
  p_payment_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_booking RECORD;
  v_invoice_number TEXT;
  v_user RECORD;
BEGIN
  -- Obtener pago
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;
  
  IF v_payment.status NOT IN ('pending', 'submitted') THEN
    RETURN json_build_object('success', false, 'error', 'Payment cannot be confirmed in current status');
  END IF;
  
  -- Actualizar pago
  UPDATE payments SET
    status = 'confirmed',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Obtener booking
  SELECT * INTO v_booking FROM banner_bookings WHERE id = v_payment.booking_id;
  
  -- Aprobar el booking (se activará automáticamente cuando llegue la fecha)
  UPDATE banner_bookings SET
    status = CASE 
      WHEN start_date <= CURRENT_DATE THEN 'active'
      ELSE 'approved'
    END,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_payment.booking_id;
  
  -- Generar factura
  v_invoice_number := generate_invoice_number();
  
  SELECT username, email INTO v_user
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_payment.user_id;
  
  INSERT INTO invoices (
    payment_id, user_id, invoice_number, amount_usd, description,
    buyer_username, buyer_email, service_type, service_details
  ) VALUES (
    p_payment_id,
    v_payment.user_id,
    v_invoice_number,
    v_payment.amount_usd,
    'Banner publicitario - ' || v_booking.position || ' (' || v_booking.format || ')',
    v_user.username,
    v_user.email,
    'banner_ad',
    json_build_object(
      'booking_id', v_booking.id,
      'zone_id', v_booking.zone_id,
      'position', v_booking.position,
      'format', v_booking.format,
      'start_date', v_booking.start_date,
      'end_date', v_booking.end_date,
      'duration_days', v_booking.duration_days
    )::jsonb
  );
  
  RETURN json_build_object(
    'success', true, 
    'invoice_number', v_invoice_number,
    'booking_status', CASE WHEN v_booking.start_date <= CURRENT_DATE THEN 'active' ELSE 'approved' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rechazar pago
CREATE OR REPLACE FUNCTION reject_payment(
  p_payment_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE payments SET
    status = 'rejected',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_payment_id AND status IN ('pending', 'submitted');
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found or already processed');
  END IF;
  
  -- Rechazar booking asociado
  UPDATE banner_bookings SET
    status = 'rejected',
    admin_notes = 'Pago rechazado: ' || p_reason,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = (SELECT booking_id FROM payments WHERE id = p_payment_id);
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
