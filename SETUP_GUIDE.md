# Guía de Setup Completa - TransForo

Esta guía te ayudará a configurar y ejecutar TransForo en tu entorno local.

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn/pnpm
- Una cuenta en [Supabase](https://supabase.com)
- Git

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <tu-repo-url>
cd project
```

### 2. Instalar Dependencias

```bash
npm install
# o
yarn install
# o
pnpm install
```

### 3. Configurar Supabase

#### 3.1 Crear Proyecto en Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Crea un nuevo proyecto
3. Espera a que se inicialice (2-3 minutos)
4. Guarda tus credenciales:
   - **Project URL**: `https://xxxx.supabase.co`
   - **Anon Key**: La clave pública (empieza con `eyJ...`)

#### 3.2 Ejecutar Migraciones de Base de Datos

Opción A - Usando Supabase Dashboard (Recomendado para principiantes):

1. Ve a SQL Editor en Supabase Dashboard
2. Ejecuta los archivos en orden:
   ```
   supabase/migrations/001_base_schema.sql
   supabase/migrations/002_extended_features.sql
   supabase/migrations/003_geographic_data.sql
   supabase/migrations/20260116060517_004_more_regions.sql
   supabase/migrations/20260128000000_add_extensive_cities.sql
   supabase/migrations/20260128190000_security_rls_policies.sql ⚠️ CRÍTICO
   ```
3. Espera a que cada script termine antes de ejecutar el siguiente

Opción B - Usando Supabase CLI:

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Vincular proyecto
supabase link --project-ref <tu-project-id>

# Ejecutar migraciones
supabase db push
```

#### 3.3 Poblar Datos Iniciales (Opcional)

Si quieres datos de prueba:

```bash
npm run seed
```

### 4. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env.local

# Editar .env.local con tus credenciales
```

Contenido de `.env.local`:

```env
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Configurar Supabase Storage (Para Imágenes)

1. Ve a Storage en Supabase Dashboard
2. Crea los siguientes buckets:
   - `avatars` (público)
   - `media` (público)
   - `attachments` (privado)

3. Configura políticas de Storage:

**Para bucket `avatars`:**
```sql
-- SELECT (lectura pública)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- INSERT (usuarios autenticados)
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- DELETE (solo el dueño)
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Para bucket `media`:**
```sql
-- SELECT (solo media aprobada)
CREATE POLICY "Approved media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- INSERT (usuarios autenticados)
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);
```

### 6. Actualizar next.config.js

Actualiza el dominio de Supabase en `next.config.js` línea 15:

```javascript
images: {
  domains: ['tu-proyecto.supabase.co'], // ← Cambiar aquí
  // ...
}
```

### 7. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## ✅ Verificación de Setup

### Checklist de Verificación

- [ ] El sitio carga sin errores
- [ ] Puedes ver la página principal
- [ ] Las imágenes se cargan correctamente
- [ ] Puedes registrar una cuenta nueva
- [ ] Puedes iniciar sesión
- [ ] Las notificaciones aparecen en tiempo real
- [ ] Puedes crear un hilo
- [ ] Puedes responder a un hilo
- [ ] La búsqueda funciona

### Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm run start

# Linting
npm run lint

# Type checking
npm run typecheck
```

## 🔧 Troubleshooting

### Error: "Supabase client error"
**Causa**: Variables de entorno mal configuradas

**Solución**:
1. Verifica que `.env.local` existe
2. Verifica que las URLs y keys son correctas
3. Reinicia el servidor de desarrollo

### Error: "403 Forbidden"
**Causa**: Políticas RLS no configuradas

**Solución**:
1. Ejecuta la migración `20260128190000_security_rls_policies.sql`
2. Verifica en Supabase Dashboard → Authentication → Policies

### Error: "Network error" al subir imágenes
**Causa**: Storage buckets no creados o políticas faltantes

**Solución**:
1. Crea los buckets en Storage
2. Aplica las políticas de Storage mencionadas arriba

### Error: "Module not found"
**Causa**: Dependencias no instaladas

**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### La búsqueda no devuelve resultados
**Causa**: Base de datos vacía

**Solución**:
```bash
npm run seed  # Poblar datos de prueba
```

## 🧪 Testing

### Crear Usuario Admin de Prueba

1. Registra un usuario normalmente
2. En Supabase Dashboard → SQL Editor:
   ```sql
   UPDATE profiles 
   SET role = 'admin', is_verified = true 
   WHERE username = 'tu_username';
   ```

### Probar Notificaciones en Tiempo Real

1. Abre dos ventanas del navegador
2. Inicia sesión con usuarios diferentes
3. Usuario A responde al hilo de Usuario B
4. Usuario B debería ver notificación inmediatamente

### Probar Upload de Imágenes

1. Ve a tu perfil
2. Click en "Editar perfil"
3. Sube un avatar
4. Verifica que aparece en Storage → avatars

## 📚 Recursos Adicionales

### Documentación Relevante

- [Next.js 13 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

### Archivos Importantes del Proyecto

- `lib/supabase.ts` - Cliente de Supabase
- `lib/auth-context.tsx` - Contexto de autenticación
- `lib/validation.ts` - Schemas de validación
- `lib/sanitize.ts` - Funciones de sanitización
- `lib/search.ts` - Sistema de búsqueda
- `lib/storage.ts` - Manejo de archivos
- `lib/notifications.ts` - Sistema de notificaciones
- `middleware.ts` - Rate limiting y seguridad

### Scripts Personalizados

```bash
# Ejecutar migraciones
npm run migrate

# Seed de datos de prueba
npm run seed

# Verificar tipos
npm run typecheck

# Formatear código
npm run format
```

## 🐛 Reportar Problemas

Si encuentras algún problema:

1. Verifica la sección de Troubleshooting
2. Revisa los logs del servidor: `npm run dev`
3. Revisa logs de Supabase Dashboard
4. Abre un issue en GitHub con:
   - Descripción del problema
   - Pasos para reproducir
   - Mensajes de error
   - Versión de Node.js
   - Sistema operativo

## 🎉 ¡Todo Listo!

Si llegaste hasta aquí sin errores, ¡felicidades! Tu instalación de TransForo está completa.

Próximos pasos sugeridos:
1. Personaliza el tema en `globals.css`
2. Configura dominio personalizado
3. Implementa analytics
4. Revisa `DEPLOYMENT_GUIDE.md` para producción

---

**¿Necesitas ayuda?** Revisa la documentación completa en el README.md
