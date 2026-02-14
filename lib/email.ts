/**
 * Sistema de envío de emails con Resend
 * Configurar RESEND_API_KEY en variables de entorno
 */

// Tipos
export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Enviar email usando Resend
 * Requiere: npm install resend
 */
export async function sendEmail(template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar si Resend está configurado
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    // Importar dinámicamente Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'TS Rating <noreply@tsrating.com>',
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.info('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Escape HTML entities in user-provided strings before interpolating
 * into email templates. Prevents stored XSS via email.
 */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize a URL for safe interpolation into href attributes.
 * Only allows http/https protocols and escapes HTML-special chars.
 */
function escUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return esc(parsed.toString());
  } catch {
    return '';
  }
}

/**
 * Branded email wrapper — dark theme matching TS Rating
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsrating.com';

function emailShell(headerBg: string, icon: string, title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0a1a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td align="center" style="padding-bottom:30px;">
    <span style="font-size:32px;font-weight:800;color:#a78bfa;">TS Rating</span>
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
    <p style="margin:0;color:#4a4460;font-size:11px;">&copy; 2026 TS Rating &mdash; Comunidad Profesional</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function btn(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 0 28px;">
    <a href="${escUrl(url)}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">${label}</a>
  </td></tr></table>`;
}

function fallback(url: string): string {
  return `<p style="margin:0;color:#8b83a0;font-size:13px;">Si el botón no funciona, copia y pega este enlace:</p>
<p style="margin:8px 0 0;word-break:break-all;color:#7c3aed;font-size:12px;">${esc(url)}</p>`;
}

/**
 * Templates de email
 */

export const EmailTemplates = {
  /**
   * Email de bienvenida
   */
  welcome: (username: string, verificationUrl?: string): EmailTemplate => ({
    to: '',
    subject: '¡Bienvenida a TS Rating! 🎉',
    html: emailShell(
      'linear-gradient(135deg,#7c3aed,#6366f1,#8b5cf6)', '🎉',
      '¡Bienvenida a TS Rating!', 'Estamos felices de tenerte',
      `<p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
       <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
         Estamos emocionadas de tenerte en nuestra comunidad. <strong style="color:#a78bfa;">TS Rating</strong> es un espacio seguro donde puedes:
       </p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#15101f;border-radius:10px;margin-bottom:24px;">
         <tr><td style="padding:20px 24px;">
           <table role="presentation" cellpadding="0" cellspacing="0">
             <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">💬 Compartir experiencias y consejos</td></tr>
             <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">🤝 Conectar con otras profesionales</td></tr>
             <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">🌍 Participar en discusiones de tu zona</td></tr>
             <tr><td style="padding:4px 0;color:#c4bdd6;font-size:14px;">📚 Acceder a recursos útiles</td></tr>
           </table>
         </td></tr>
       </table>
       ${verificationUrl ? btn(verificationUrl, 'Verificar Email') : ''}
       <p style="margin:0 0 16px;color:#c4bdd6;font-size:14px;">Recuerda leer nuestras <a href="${SITE}/reglas" style="color:#a78bfa;">reglas del foro</a>.</p>
       <p style="margin:0;color:#e2ddf5;font-size:15px;">¡Nos vemos en los foros!</p>
       ${verificationUrl ? fallback(verificationUrl) : ''}`
    ),
    text: `¡Bienvenida a TS Rating, @${esc(username)}!\n\nEstamos emocionadas de tenerte en nuestra comunidad.\n\n${verificationUrl ? `Verifica tu email: ${verificationUrl}\n\n` : ''}Recuerda leer nuestras reglas del foro.\n\n¡Nos vemos en los foros!`,
  }),

  /**
   * Email de verificación
   */
  verification: (username: string, verificationUrl: string): EmailTemplate => ({
    to: '',
    subject: '✉️ Verifica tu email — TS Rating',
    html: emailShell(
      'linear-gradient(135deg,#7c3aed,#6366f1,#8b5cf6)', '✉️',
      'Verifica tu email', 'Solo un paso más',
      `<p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
       <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
         Por favor verifica tu dirección de email haciendo clic en el botón:
       </p>
       ${btn(verificationUrl, 'Verificar Email')}
       <p style="margin:0 0 16px;color:#c4bdd6;font-size:13px;">Este enlace expira en 24 horas.</p>
       ${fallback(verificationUrl)}`
    ),
    text: `Verifica tu email\n\nHola @${esc(username)},\n\nPor favor verifica tu email visitando:\n${verificationUrl}\n\nEste enlace expira en 24 horas.`,
  }),

  /**
   * Email de reset de contraseña
   */
  resetPassword: (username: string, resetUrl: string): EmailTemplate => ({
    to: '',
    subject: '🔐 Restablecer tu contraseña — TS Rating',
    html: emailShell(
      'linear-gradient(135deg,#dc2626,#b91c1c,#ef4444)', '🔐',
      'Restablecer contraseña', 'Solicitud de cambio de contraseña',
      `<p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
       <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
         Recibimos una solicitud para restablecer tu contraseña en <strong style="color:#a78bfa;">TS Rating</strong>.
       </p>
       ${btn(resetUrl, 'Restablecer Contraseña')}
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
       ${fallback(resetUrl)}`
    ),
    text: `Restablecer Contraseña\n\nHola @${esc(username)},\n\nPara restablecer tu contraseña, visita:\n${resetUrl}\n\nSi no solicitaste esto, ignora este email.\n\nEste enlace expira en 1 hora.`,
  }),

  /**
   * Notificación de nueva respuesta en hilo
   */
  newReply: (username: string, threadTitle: string, replyAuthor: string, threadUrl: string): EmailTemplate => ({
    to: '',
    subject: `💬 Nueva respuesta en "${threadTitle}"`,
    html: emailShell(
      'linear-gradient(135deg,#0891b2,#0284c7,#06b6d4)', '💬',
      'Nueva respuesta en tu hilo', esc(threadTitle),
      `<p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)} 👋</p>
       <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
         <strong style="color:#a78bfa;">@${esc(replyAuthor)}</strong> respondió a tu hilo:
       </p>
       <p style="margin:0 0 20px;color:#e2ddf5;font-size:18px;font-weight:bold;">"${esc(threadTitle)}"</p>
       ${btn(threadUrl, 'Ver Respuesta')}
       <p style="margin:0;color:#8b83a0;font-size:13px;">Puedes desactivar estas notificaciones en tu configuración.</p>`
    ),
    text: `Nueva respuesta en tu hilo\n\nHola @${esc(username)},\n\n@${esc(replyAuthor)} respondió a "${esc(threadTitle)}"\n\nVer respuesta: ${threadUrl}`,
  }),

  /**
   * Email de suspensión
   */
  suspension: (username: string, reason: string, expiresAt?: string): EmailTemplate => ({
    to: '',
    subject: '⛔ Tu cuenta ha sido suspendida — TS Rating',
    html: emailShell(
      'linear-gradient(135deg,#dc2626,#991b1b,#b91c1c)', '⛔',
      'Cuenta Suspendida', expiresAt ? `Hasta ${esc(expiresAt)}` : 'Suspensión permanente',
      `<p style="margin:0 0 20px;color:#e2ddf5;font-size:16px;">Hola @${esc(username)},</p>
       <p style="margin:0 0 20px;color:#c4bdd6;font-size:15px;line-height:1.6;">
         Tu cuenta en <strong style="color:#a78bfa;">TS Rating</strong> ha sido suspendida ${expiresAt ? `hasta <strong>${esc(expiresAt)}</strong>` : '<strong>permanentemente</strong>'}.
       </p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f1520;border-radius:10px;border:1px solid #3d2240;margin-bottom:24px;">
         <tr><td style="padding:20px 24px;">
           <p style="margin:0 0 8px;color:#f87171;font-size:14px;font-weight:600;">Razón:</p>
           <p style="margin:0;color:#e2ddf5;font-size:15px;">${esc(reason)}</p>
         </td></tr>
       </table>
       <p style="margin:0 0 12px;color:#c4bdd6;font-size:14px;">Si crees que esto es un error, contacta a los moderadores.</p>
       <p style="margin:0;color:#c4bdd6;font-size:14px;">Recuerda revisar nuestras <a href="${SITE}/reglas" style="color:#a78bfa;">reglas del foro</a>.</p>`
    ),
    text: `Cuenta Suspendida\n\nHola @${esc(username)},\n\nTu cuenta ha sido suspendida ${expiresAt ? `hasta ${esc(expiresAt)}` : 'permanentemente'}.\n\nRazón: ${esc(reason)}`,
  }),
};

/**
 * Helpers para enviar emails específicos
 */
export const Emails = {
  sendWelcome: async (email: string, username: string, verificationUrl?: string) => {
    const template = EmailTemplates.welcome(username, verificationUrl);
    return sendEmail({ ...template, to: email });
  },

  sendVerification: async (email: string, username: string, verificationUrl: string) => {
    const template = EmailTemplates.verification(username, verificationUrl);
    return sendEmail({ ...template, to: email });
  },

  sendPasswordReset: async (email: string, username: string, resetUrl: string) => {
    const template = EmailTemplates.resetPassword(username, resetUrl);
    return sendEmail({ ...template, to: email });
  },

  sendNewReply: async (email: string, username: string, threadTitle: string, replyAuthor: string, threadUrl: string) => {
    const template = EmailTemplates.newReply(username, threadTitle, replyAuthor, threadUrl);
    return sendEmail({ ...template, to: email });
  },

  sendSuspension: async (email: string, username: string, reason: string, expiresAt?: string) => {
    const template = EmailTemplates.suspension(username, reason, expiresAt);
    return sendEmail({ ...template, to: email });
  },
};
