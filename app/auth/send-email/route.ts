import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsrating.com';
const HOOK_SECRET = process.env.AUTH_SEND_EMAIL_HOOK_SECRET;

/**
 * Supabase Auth Hook — Send Email
 * 
 * Supabase calls this endpoint instead of sending its default auth emails.
 * Configure in Supabase Dashboard: Auth > Hooks > Send Email > HTTP
 * 
 * Payload shape from Supabase:
 * {
 *   "user": { "id", "email", "user_metadata": { "username" } },
 *   "email_data": {
 *     "token", "token_hash", "redirect_to",
 *     "email_action_type": "signup" | "recovery" | "email_change" | "magic_link" | ...
 *     "confirmation_url": "..."
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify hook secret to prevent unauthorized calls
    if (HOOK_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${HOOK_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const { user, email_data } = payload;

    if (!user?.email || !email_data?.email_action_type) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const email = user.email;
    const username = user.user_metadata?.username || user.email.split('@')[0];
    const actionType = email_data.email_action_type;
    const confirmationUrl = email_data.confirmation_url || '';
    const token = email_data.token || '';

    let result;

    switch (actionType) {
      case 'signup': {
        const html = buildConfirmSignupEmail(username, confirmationUrl);
        result = await sendEmail({
          to: email,
          subject: '✉️ Confirma tu cuenta en TS Rating',
          html,
          text: `Hola @${username}, confirma tu cuenta visitando: ${confirmationUrl}`,
        });
        break;
      }

      case 'recovery': {
        const resetUrl = confirmationUrl || `${SITE_URL}/restablecer-contrasena#token=${token}`;
        const html = buildResetPasswordEmail(username, resetUrl);
        result = await sendEmail({
          to: email,
          subject: '🔐 Restablecer tu contraseña — TS Rating',
          html,
          text: `Hola @${username}, restablece tu contraseña visitando: ${resetUrl}`,
        });
        break;
      }

      case 'magic_link': {
        const html = buildMagicLinkEmail(username, confirmationUrl);
        result = await sendEmail({
          to: email,
          subject: '🔗 Tu enlace de acceso — TS Rating',
          html,
          text: `Hola @${username}, accede a tu cuenta visitando: ${confirmationUrl}`,
        });
        break;
      }

      case 'email_change': {
        const html = buildEmailChangeEmail(username, confirmationUrl);
        result = await sendEmail({
          to: email,
          subject: '📧 Confirma tu nuevo email — TS Rating',
          html,
          text: `Hola @${username}, confirma tu nuevo email visitando: ${confirmationUrl}`,
        });
        break;
      }

      default: {
        console.warn(`[send-email] Unknown action type: ${actionType}`);
        // Fallback — still send a generic confirmation
        result = await sendEmail({
          to: email,
          subject: 'TS Rating — Acción requerida',
          html: buildGenericEmail(username, confirmationUrl, actionType),
          text: `Hola @${username}, visita: ${confirmationUrl}`,
        });
      }
    }

    if (!result.success) {
      console.error(`[send-email] Failed to send ${actionType} email to ${email}:`, result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.info(`[send-email] Sent ${actionType} email to ${email}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[send-email] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Email builder helpers ───────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailWrapper(headerBg: string, icon: string, title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0a1a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td align="center" style="padding-bottom:30px;">
    <span style="font-size:32px;font-weight:800;color:#a78bfa;letter-spacing:-0.5px;">TS Rating</span>
  </td></tr>
  <tr><td style="background-color:#1a1225;border-radius:16px;overflow:hidden;border:1px solid #2d2240;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:${headerBg};padding:40px 40px 30px;text-align:center;">
        <div style="width:64px;height:64px;margin:0 auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;line-height:64px;font-size:28px;">${icon}</div>
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${title}</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">${subtitle}</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:32px 40px;">${body}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:30px 20px;text-align:center;">
    <p style="margin:0 0 8px;color:#6b6280;font-size:13px;">Este email fue enviado por <strong>TS Rating</strong></p>
    <p style="margin:0;color:#4a4460;font-size:11px;">© 2026 TS Rating — Comunidad Profesional</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:12px 0 28px;">
    <a href="${esc(url)}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">${label}</a>
  </td></tr>
</table>`;
}

function fallbackLink(url: string): string {
  return `<p style="margin:0;color:#8b83a0;font-size:13px;">Si el botón no funciona, copia y pega este enlace:</p>
<p style="margin:8px 0 0;word-break:break-all;color:#7c3aed;font-size:12px;">${esc(url)}</p>`;
}

function buildConfirmSignupEmail(username: string, confirmUrl: string): string {
  const body = `
    <p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">¡Hola @${esc(username)}! 👋</p>
    <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
      Gracias por registrarte en <strong style="color:#a78bfa;">TS Rating</strong>. Para activar tu cuenta y acceder a todas las funciones, confirma tu email:
    </p>
    ${ctaButton(confirmUrl, 'Confirmar mi cuenta')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#15101f;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;color:#a78bfa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Con tu cuenta puedes:</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">💬 Crear hilos y participar en discusiones</td></tr>
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">⭐ Publicar reseñas y compartir experiencias</td></tr>
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">🌍 Conectar con tu comunidad local</td></tr>
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">📬 Enviar mensajes privados</td></tr>
        </table>
      </td></tr>
    </table>
    ${fallbackLink(confirmUrl)}`;

  return emailWrapper(
    'linear-gradient(135deg,#7c3aed,#6366f1,#8b5cf6)',
    '✉️', 'Confirma tu cuenta', 'Solo un paso más para unirte a la comunidad', body
  );
}

function buildResetPasswordEmail(username: string, resetUrl: string): string {
  const body = `
    <p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
    <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong style="color:#a78bfa;">TS Rating</strong>.
    </p>
    ${ctaButton(resetUrl, 'Restablecer contraseña')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f1520;border-radius:10px;border:1px solid #3d2240;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 8px;color:#f87171;font-size:14px;font-weight:600;">⚠️ Seguridad</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:13px;">• Este enlace expira en <strong>1 hora</strong></td></tr>
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:13px;">• Solo se puede usar una vez</td></tr>
          <tr><td style="padding:4px 0;color:#c4bdd6;font-size:13px;">• Si no solicitaste esto, ignora este email</td></tr>
        </table>
      </td></tr>
    </table>
    ${fallbackLink(resetUrl)}`;

  return emailWrapper(
    'linear-gradient(135deg,#dc2626,#b91c1c,#ef4444)',
    '🔐', 'Restablecer contraseña', 'Solicitud de cambio de contraseña', body
  );
}

function buildMagicLinkEmail(username: string, magicUrl: string): string {
  const body = `
    <p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
    <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
      Usa el siguiente enlace para acceder a tu cuenta en <strong style="color:#a78bfa;">TS Rating</strong>:
    </p>
    ${ctaButton(magicUrl, 'Acceder a mi cuenta')}
    <p style="margin:0 0 16px;color:#c4bdd6;font-size:13px;">Este enlace expira en 1 hora y solo se puede usar una vez.</p>
    ${fallbackLink(magicUrl)}`;

  return emailWrapper(
    'linear-gradient(135deg,#0891b2,#0284c7,#06b6d4)',
    '🔗', 'Tu enlace de acceso', 'Accede sin contraseña', body
  );
}

function buildEmailChangeEmail(username: string, confirmUrl: string): string {
  const body = `
    <p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
    <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
      Solicitaste cambiar la dirección de email de tu cuenta en <strong style="color:#a78bfa;">TS Rating</strong>. Confirma tu nueva dirección:
    </p>
    ${ctaButton(confirmUrl, 'Confirmar nuevo email')}
    <p style="margin:0 0 16px;color:#c4bdd6;font-size:13px;">Si no solicitaste este cambio, contacta con los moderadores inmediatamente.</p>
    ${fallbackLink(confirmUrl)}`;

  return emailWrapper(
    'linear-gradient(135deg,#059669,#047857,#10b981)',
    '📧', 'Confirma tu nuevo email', 'Cambio de dirección de email', body
  );
}

function buildGenericEmail(username: string, actionUrl: string, _actionType: string): string {
  const body = `
    <p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
    <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
      Se requiere una acción en tu cuenta de <strong style="color:#a78bfa;">TS Rating</strong>:
    </p>
    ${ctaButton(actionUrl, 'Continuar')}
    ${fallbackLink(actionUrl)}`;

  return emailWrapper(
    'linear-gradient(135deg,#7c3aed,#6366f1,#8b5cf6)',
    '📋', 'Acción requerida', 'Tu cuenta necesita atención', body
  );
}
