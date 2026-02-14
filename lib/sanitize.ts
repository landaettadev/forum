/**
 * Utilidades de sanitización y validación para prevenir XSS y otras vulnerabilidades
 */

import DOMPurify from 'isomorphic-dompurify';

// Etiquetas HTML permitidas (whitelist)
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img'
];

// Atributos permitidos por etiqueta
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
};

// Protocolos permitidos en URLs
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Sanitiza contenido HTML eliminando scripts y etiquetas no permitidas
 * Utiliza DOMPurify para sanitización robusta contra XSS
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [
      ...ALLOWED_ATTRIBUTES.a,
      ...ALLOWED_ATTRIBUTES.img,
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Escapa caracteres HTML especiales para prevenir XSS
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitiza una URL para asegurar que use protocolo seguro
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url, 'https://example.com');
    
    // Verificar protocolo permitido
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return '';
    }
    
    return url;
  } catch {
    // URL inválida
    return '';
  }
}

/**
 * Valida y sanitiza nombre de usuario
 */
export function sanitizeUsername(username: string): string {
  if (!username) return '';
  
  // Solo letras, números, guiones y guiones bajos
  // Máximo 20 caracteres
  return username
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 20)
    .toLowerCase();
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitiza contenido de post para almacenar en BD
 * Permite algunas etiquetas HTML básicas
 */
export function sanitizePostContent(content: string): string {
  if (!content) return '';
  
  // Primero sanitizar HTML peligroso
  let sanitized = sanitizeHtml(content);
  
  // Limitar longitud (ej: 50000 caracteres)
  sanitized = sanitized.substring(0, 50000);
  
  return sanitized.trim();
}

/**
 * Valida longitud de contenido
 */
export function validateContentLength(
  content: string,
  minLength: number = 1,
  maxLength: number = 50000
): { valid: boolean; error?: string } {
  if (!content || content.trim().length < minLength) {
    return {
      valid: false,
      error: `El contenido debe tener al menos ${minLength} caracteres`,
    };
  }
  
  if (content.length > maxLength) {
    return {
      valid: false,
      error: `El contenido no puede exceder ${maxLength} caracteres`,
    };
  }
  
  return { valid: true };
}

/**
 * Detecta spam básico en contenido
 */
export function detectSpam(content: string): boolean {
  if (!content) return false;
  
  const spamPatterns = [
    /viagra/i,
    /cialis/i,
    /\b(buy|cheap|discount)\s+(now|here)\b/i,
    /(click here|click now)/i,
    /\$\$\$/,
    /(lottery|winner|congratulations.*won)/i,
  ];
  
  return spamPatterns.some(pattern => pattern.test(content));
}

/**
 * Valida que el contenido no tenga demasiados enlaces (anti-spam)
 */
export function validateLinkCount(content: string, maxLinks: number = 5): boolean {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = content.match(urlRegex);
  return !matches || matches.length <= maxLinks;
}

/**
 * Sanitiza nombre de archivo para uploads
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Remover caracteres peligrosos
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

/**
 * Valida tamaño de archivo
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 5): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * Valida tipo de archivo (MIME type)
 */
export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Tipos de imagen permitidos
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Extrae texto plano de HTML (para previews)
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Trunca texto y agrega "..."
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Escape special PostgreSQL LIKE/ILIKE pattern characters so user input
 * is treated as literal text, not as wildcards.
 *   %  → \%
 *   _  → \_
 *   \  → \\
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

