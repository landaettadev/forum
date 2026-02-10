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
      from: process.env.EMAIL_FROM || 'TransForo <noreply@transforo.com>',
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Templates de email
 */

export const EmailTemplates = {
  /**
   * Email de bienvenida
   */
  welcome: (username: string, verificationUrl?: string): EmailTemplate => ({
    to: '', // Se debe llenar al llamar
    subject: '¡Bienvenida a TransForo! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenida a TransForo!</h1>
            </div>
            <div class="content">
              <h2>Hola @${username},</h2>
              <p>Estamos emocionadas de tenerte en nuestra comunidad. TransForo es un espacio seguro donde puedes:</p>
              <ul>
                <li>Compartir experiencias y consejos</li>
                <li>Conectar con otras profesionales</li>
                <li>Participar en discusiones de tu zona</li>
                <li>Acceder a recursos útiles</li>
              </ul>
              ${verificationUrl ? `
                <p><strong>Verifica tu email para acceder a todas las funciones:</strong></p>
                <a href="${verificationUrl}" class="button">Verificar Email</a>
              ` : ''}
              <p>Recuerda leer nuestras <a href="${process.env.NEXT_PUBLIC_SITE_URL}/reglas">reglas del foro</a> para mantener un ambiente respetuoso.</p>
              <p>¡Nos vemos en los foros!</p>
            </div>
            <div class="footer">
              <p>TransForo - Comunidad Profesional</p>
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}">Visitar el sitio</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `¡Bienvenida a TransForo, @${username}!\n\nEstamos emocionadas de tenerte en nuestra comunidad.\n\n${verificationUrl ? `Verifica tu email: ${verificationUrl}\n\n` : ''}Recuerda leer nuestras reglas del foro.\n\n¡Nos vemos en los foros!`,
  }),

  /**
   * Email de verificación
   */
  verification: (username: string, verificationUrl: string): EmailTemplate => ({
    to: '',
    subject: 'Verifica tu email en TransForo',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2>Verifica tu email</h2>
            <p>Hola @${username},</p>
            <p>Por favor verifica tu dirección de email haciendo clic en el botón:</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Verificar Email
            </a>
            <p>O copia este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>Este enlace expirará en 24 horas.</p>
          </div>
        </body>
      </html>
    `,
    text: `Verifica tu email\n\nHola @${username},\n\nPor favor verifica tu email visitando:\n${verificationUrl}\n\nEste enlace expira en 24 horas.`,
  }),

  /**
   * Email de reset de contraseña
   */
  resetPassword: (username: string, resetUrl: string): EmailTemplate => ({
    to: '',
    subject: 'Restablecer tu contraseña en TransForo',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2>Restablecer Contraseña</h2>
            <p>Hola @${username},</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Restablecer Contraseña
            </a>
            <p><strong>Si no solicitaste esto, ignora este email.</strong></p>
            <p>Este enlace expirará en 1 hora por seguridad.</p>
          </div>
        </body>
      </html>
    `,
    text: `Restablecer Contraseña\n\nHola @${username},\n\nPara restablecer tu contraseña, visita:\n${resetUrl}\n\nSi no solicitaste esto, ignora este email.\n\nEste enlace expira en 1 hora.`,
  }),

  /**
   * Notificación de nueva respuesta en hilo
   */
  newReply: (username: string, threadTitle: string, replyAuthor: string, threadUrl: string): EmailTemplate => ({
    to: '',
    subject: `Nueva respuesta en "${threadTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2>Nueva respuesta en tu hilo</h2>
            <p>Hola @${username},</p>
            <p><strong>@${replyAuthor}</strong> respondió a tu hilo:</p>
            <p style="font-size: 18px; font-weight: bold;">"${threadTitle}"</p>
            <a href="${threadUrl}" style="display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Ver Respuesta
            </a>
            <p style="color: #666; font-size: 14px;">Puedes desactivar estas notificaciones en tu configuración.</p>
          </div>
        </body>
      </html>
    `,
    text: `Nueva respuesta en tu hilo\n\nHola @${username},\n\n@${replyAuthor} respondió a "${threadTitle}"\n\nVer respuesta: ${threadUrl}`,
  }),

  /**
   * Email de suspensión
   */
  suspension: (username: string, reason: string, expiresAt?: string): EmailTemplate => ({
    to: '',
    subject: 'Tu cuenta ha sido suspendida',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Cuenta Suspendida</h2>
            <p>Hola @${username},</p>
            <p>Tu cuenta en TransForo ha sido suspendida ${expiresAt ? `hasta ${expiresAt}` : 'permanentemente'}.</p>
            <p><strong>Razón:</strong> ${reason}</p>
            <p>Si crees que esto es un error, puedes contactar a los moderadores.</p>
            <p>Recuerda revisar nuestras <a href="${process.env.NEXT_PUBLIC_SITE_URL}/reglas">reglas del foro</a>.</p>
          </div>
        </body>
      </html>
    `,
    text: `Cuenta Suspendida\n\nHola @${username},\n\nTu cuenta ha sido suspendida ${expiresAt ? `hasta ${expiresAt}` : 'permanentemente'}.\n\nRazón: ${reason}`,
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
