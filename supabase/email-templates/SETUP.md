# Configuración de Emails Personalizados — TS Rating

## Paso 1: Configurar SMTP con Resend

En el **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**:

| Campo | Valor |
|-------|-------|
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | Tu `RESEND_API_KEY` |
| **Sender email** | `noreply@tsrating.com` |
| **Sender name** | `TS Rating` |
| **Minimum interval** | `30` (seconds) |

> Alternativa: Si usas otro proveedor (SendGrid, Mailgun, etc.), usa sus credenciales SMTP.

## Paso 2: Personalizar Email Templates en Dashboard

En **Supabase Dashboard** → **Auth** → **Email Templates**:

### Confirm signup
1. Pega el contenido de `confirm-signup.html`
2. **Subject**: `✉️ Confirma tu cuenta en TS Rating`
3. Variables disponibles: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`

### Reset password  
1. Pega el contenido de `reset-password.html`
2. **Subject**: `🔐 Restablecer tu contraseña — TS Rating`
3. Variables disponibles: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`

## Paso 3 (Avanzado): Auth Hook para control total desde código

Para que Supabase llame a TU API en vez de enviar emails directamente:

### 3.1 Variables de entorno

Añade en `.env`:

```
AUTH_SEND_EMAIL_HOOK_SECRET=tu-secret-super-seguro-aqui
```

### 3.2 Configurar el Hook en Supabase

En **Supabase Dashboard** → **Auth** → **Hooks**:

1. Habilita **Send Email Hook**
2. Tipo: **HTTP Request**
3. URL: `https://tudominio.com/auth/send-email`
4. HTTP Headers:
   ```
   Authorization: Bearer tu-secret-super-seguro-aqui
   ```
5. Guarda

### 3.3 Para desarrollo local

Puedes usar ngrok o similar para exponer tu localhost:

```bash
npx ngrok http 3000
```

Y usar la URL de ngrok como endpoint del hook.

## Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `supabase/email-templates/confirm-signup.html` | Template para pegar en Dashboard (signup) |
| `supabase/email-templates/reset-password.html` | Template para pegar en Dashboard (recovery) |
| `app/auth/send-email/route.ts` | API endpoint para Auth Hook (envío programático via Resend) |
| `lib/email.ts` | Utilidades de envío con Resend (ya existía) |

## Probar emails

1. **Dashboard templates**: Registra un usuario nuevo, debería recibir el email branded
2. **Auth Hook**: Verifica en los logs de Supabase que el hook se ejecuta
3. **Resend Dashboard**: Verifica el envío en https://resend.com/emails
