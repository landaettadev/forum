/**
 * Validación de imágenes de banner
 * Verifica dimensiones exactas según el formato seleccionado
 */

import type { BannerFormat } from './supabase';
import { getDimensionsForFormat } from './banner-pricing';

const ALLOWED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BANNER_SIZE_MB = 2;

export interface BannerValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validar archivo de banner (tipo, tamaño)
 */
export function validateBannerFile(file: File): BannerValidationResult {
  if (!ALLOWED_BANNER_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no permitido. Usa JPG, PNG, GIF o WebP.',
    };
  }

  const maxBytes = MAX_BANNER_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `El archivo es muy grande (máximo ${MAX_BANNER_SIZE_MB}MB).`,
    };
  }

  return { valid: true };
}

/**
 * Validar dimensiones exactas de la imagen del banner (client-side)
 * Retorna una Promise porque necesita cargar la imagen para medir
 */
export function validateBannerDimensions(
  file: File,
  format: BannerFormat
): Promise<BannerValidationResult> {
  return new Promise((resolve) => {
    const { width: expectedW, height: expectedH } = getDimensionsForFormat(format);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width !== expectedW || img.height !== expectedH) {
        resolve({
          valid: false,
          error: `La imagen debe ser exactamente ${expectedW}×${expectedH}px. Tu imagen es ${img.width}×${img.height}px.`,
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve({ valid: false, error: 'No se pudo leer la imagen.' });
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validación completa de banner (archivo + dimensiones)
 */
export async function validateBanner(
  file: File,
  format: BannerFormat
): Promise<BannerValidationResult> {
  const fileCheck = validateBannerFile(file);
  if (!fileCheck.valid) return fileCheck;

  const dimCheck = await validateBannerDimensions(file, format);
  return dimCheck;
}
