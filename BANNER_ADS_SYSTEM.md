# Sistema de Gestión de Banners Publicitarios — TransForo

## Análisis del Prompt Reformulado

### Contexto Actual
- Existe un componente `BannerSlot` que muestra placeholders estáticos en 4 posiciones: header (728x90), footer (728x90), sidebar (300x250), content (728x90).
- Los banners se usan en: Home, Footer global, páginas de Anuncios.
- Existe `escort_ads` (anuncios clasificados de usuarios) — esto es DIFERENTE del sistema de banners publicitarios.
- El admin panel tiene gestión de usuarios, reportes, verificaciones, filtros, logs, pero **no tiene gestión de publicidad**.
- Jerarquía geográfica existente: Continente > País > Región/Ciudad.

### Definición del Sistema

**Concepto core:** Vender espacios publicitarios (banners) en el foro. Cada banner slot es un espacio alquilable por tiempo determinado. Si nadie alquila el espacio, se muestra publicidad de terceros (JuicyAds, etc.) configurada por el admin.

### Zonas Publicitarias (Ad Zones)

| Nivel | Descripción | Páginas afectadas | Independencia |
|-------|------------|-------------------|---------------|
| **Home/País** | Los banners del Home y de `/foros/[country]` comparten inventario | `page.tsx`, `foros/[country]/page.tsx` | Un mismo banner se ve en Home Y en la página del país |
| **Ciudad/Región** | Cada `/foros/[country]/[region]` tiene inventario independiente | `foros/[country]/[region]/page.tsx` | Cada ciudad tiene sus propios espacios, no comparten con el país ni con otras ciudades |

### Tipos de Banner (Ad Formats)

| Formato | Dimensiones | Posiciones | Vista previa para el usuario |
|---------|------------|------------|------------------------------|
| **Leaderboard** | 728 × 90 px | Header, Footer, Content (entre posts) | Mostrar mockup de la página señalando dónde aparece |
| **Medium Rectangle** | 300 × 250 px | Sidebar (lateral derecho) | Mostrar mockup del sidebar señalando ubicación |

### Estructura de Precios (Fija)

**Banners de Ciudad/Región (subforos):**

| Duración | Precio |
|----------|--------|
| 7 días   | $5     |
| 15 días  | $10    |
| 30 días  | $15    |
| 90 días  | $20    |
| 180 días | $25    |

**Banners de Home/País:**

| Duración | Precio |
|----------|--------|
| 7 días   | $10    |
| 15 días  | $20    |
| 30 días  | $30    |
| 90 días  | $40    |
| 180 días | $50    |

### Flujo de Usuario (Comprador)

1. Usuario navega a "Comprar Publicidad" (nuevo enlace en nav/sidebar)
2. Selecciona **zona**: País (Home + país) o Ciudad específica
3. Selecciona **formato de banner** (728x90 o 300x250) — se le muestra dónde aparece en la página
4. Selecciona **posición específica** (header, sidebar-top, sidebar-bottom, footer, content)
5. Ve el **calendario** con días ocupados (rojo) y disponibles (verde) para esa combinación zona+posición
6. Selecciona **fecha de inicio** (mínimo 3 días desde hoy)
7. Selecciona **duración** (7/15/30/90/180 días) — se muestra el precio
8. **Sube la imagen del banner** — el sistema valida que tenga las dimensiones exactas del formato elegido
9. Envía la solicitud → estado `pending`
10. Recibe notificación cuando el admin aprueba/rechaza

### Flujo de Admin

1. **Dashboard de Publicidad** (`/admin/ads`): Vista general con métricas de ingresos y ocupación
2. **Solicitudes Pendientes**: Lista de bookings pendientes de aprobación con info del usuario, preview del banner, zona, fechas
3. **Calendario por Zona**: Seleccionar país/ciudad y ver calendario con ocupación de cada slot, con nick+avatar del usuario
4. **Edición**: El admin puede modificar fechas, duración, zona, o cualquier detalle de un booking
5. **Fallback Ads**: Por cada slot+zona, el admin puede pegar un código JS/HTML de terceros (JuicyAds, etc.) que se muestra cuando no hay banner pagado activo
6. **Analytics**: Ingresos por zona, tasa de ocupación, historial de compras

### Lógica de Renderizado del BannerSlot

```
1. Recibir (posición, zona) del BannerSlot
2. Buscar booking activo: zone + position + hoy entre start_date y end_date + status='active'
3. Si existe → mostrar imagen del banner del usuario (con link si tiene)
4. Si NO existe → buscar fallback_code del admin para esa zone + position
5. Si existe fallback → renderizar el HTML/JS del admin
6. Si NO hay fallback → mostrar placeholder "Espacio publicitario disponible" con CTA
```

### Modelo de Datos (Nuevas Tablas)

```sql
-- Zonas publicitarias (auto-generadas desde countries/regions)
banner_ad_zones (
  id, zone_type: 'home_country' | 'city',
  country_id, region_id (nullable para home_country),
  name, is_active
)

-- Bookings de banners (solicitudes de compra)
banner_bookings (
  id, user_id, zone_id,
  position: 'header' | 'sidebar_top' | 'sidebar_bottom' | 'footer' | 'content',
  format: '728x90' | '300x250',
  image_url, click_url,
  start_date, end_date, duration_days,
  price_usd,
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'expired' | 'cancelled',
  admin_notes,
  reviewed_by, reviewed_at,
  created_at, updated_at
)

-- Códigos de fallback del admin (publicidad de terceros)
banner_fallbacks (
  id, zone_id (nullable = global fallback),
  position, format,
  code_html (el JS/HTML de JuicyAds etc.),
  is_active, priority,
  created_at, updated_at
)

-- Analytics de impresiones/clicks
banner_impressions (
  id, booking_id (nullable si es fallback),
  fallback_id (nullable si es booking),
  zone_id, position,
  ip_address, user_agent,
  event_type: 'impression' | 'click',
  created_at
)
```

---

## Plan de Desarrollo — Fases

### FASE 1: Base de Datos y Modelos
- Crear migración SQL con las 4 tablas nuevas + índices + RLS policies
- Definir tipos TypeScript en `lib/supabase.ts`
- Crear funciones RPC necesarias (check_slot_availability, get_active_banner, etc.)

### FASE 2: Lógica de Negocio (lib/)
- `lib/banner-ads.ts`: funciones core (getActiveBanner, getAvailableDates, calculatePrice, checkSlotAvailability)
- `lib/banner-pricing.ts`: tabla de precios y cálculo
- `lib/banner-validation.ts`: validación de dimensiones de imagen

### FASE 3: BannerSlot Dinámico
- Refactorizar `components/ads/banner-slot.tsx` para aceptar `zoneType` + `countryId` + `regionId`
- Implementar lógica: booking activo → imagen usuario | fallback admin → código terceros | nada → placeholder con CTA
- Actualizar todos los usos de BannerSlot en las páginas existentes pasando la zona correcta

### FASE 4: Interfaz de Compra (Usuario)
- Nueva página `/publicidad` con el flujo de compra
- Selector de zona (país/ciudad) con listbox de países y regiones
- Selector de formato+posición con mockup visual de ubicación en el sitio
- Componente de calendario interactivo mostrando disponibilidad
- Validación de fecha mínima (3 días antes)
- Selector de duración con precio visible
- Uploader de imagen con validación de dimensiones exactas
- Server Action para crear el booking (estado pending)
- Notificación al admin

### FASE 5: Admin — Panel de Publicidad
- Nueva página `/admin/ads` — dashboard principal
  - Cards de métricas: ingresos totales, bookings activos, slots ocupados, pendientes
  - Listbox de países del foro para filtrar
- `/admin/ads/pending` — solicitudes pendientes
  - Lista con preview del banner, info usuario (avatar+nick), zona, fechas, precio
  - Botones aprobar/rechazar con campo de notas
- `/admin/ads/calendar` — calendario de ocupación
  - Selector de zona (país/ciudad)
  - Vista calendario con los slots marcados: ocupados (color), nick+avatar del usuario
  - Click en un día para ver detalle del booking
- `/admin/ads/edit/[id]` — editar booking
  - Form completo: fechas, duración, zona, estado, precio, notas

### FASE 6: Admin — Fallback Ads (Terceros)
- `/admin/ads/fallbacks` — gestión de códigos de terceros
  - Listado por zona y posición
  - Textarea para pegar HTML/JS (JuicyAds, etc.)
  - Preview del código
  - Toggle activo/inactivo
  - Posibilidad de fallback global (cuando no hay uno específico por zona)

### FASE 7: Analytics y Tracking
- Componente de tracking de impresiones (registra cada vez que un banner se muestra)
- Tracking de clicks (redirect con registro)
- `/admin/ads/analytics` — dashboard de analíticas
  - Ingresos por país/ciudad
  - Tasa de ocupación por zona
  - Historial de compras
  - Gráficos de impresiones/clicks por banner

### FASE 8: Integración Final y Pulido
- Agregar BannerSlot dinámico a TODAS las páginas que faltan (foros/region, hilo/[id], etc.)
- Enlace "Publicidad" en la navegación principal y sidebar
- Notificaciones por email cuando el booking es aprobado/rechazado/expira
- Tests de la lógica de precios y disponibilidad
- Revisión de seguridad: validar que users no puedan manipular precios o fechas
- Limpiar placeholders y asegurar que fallbacks funcionan correctamente
