/**
 * Sistema de gestión de archivos con Supabase Storage
 * Maneja upload, eliminación y gestión de imágenes
 */

import { supabase } from './supabase';
import { sanitizeFilename, validateFileSize, validateFileType, ALLOWED_IMAGE_TYPES } from './sanitize';

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  MEDIA: 'media',
  ATTACHMENTS: 'attachments',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

export interface UploadOptions {
  bucket: StorageBucket;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  makePublic?: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Subir un archivo a Supabase Storage
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    // Validar tamaño
    const maxSize = options.maxSizeMB || 5;
    if (!validateFileSize(file.size, maxSize)) {
      return {
        success: false,
        error: `El archivo excede el tamaño máximo de ${maxSize}MB`,
      };
    }

    // Validar tipo
    const allowedTypes = options.allowedTypes || ALLOWED_IMAGE_TYPES;
    if (!validateFileType(file.type, allowedTypes)) {
      return {
        success: false,
        error: 'Tipo de archivo no permitido',
      };
    }

    // Sanitizar nombre y generar path único
    const sanitizedName = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = sanitizedName.split('.').pop();
    const uniqueName = `${timestamp}_${randomStr}.${extension}`;
    
    const folder = options.folder || '';
    const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

    // Subir archivo
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'Error al subir el archivo',
      };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: 'Error inesperado al subir el archivo',
    };
  }
}

/**
 * Subir imagen de avatar
 */
export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.AVATARS,
    folder: userId,
    maxSizeMB: 2,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });
}

/**
 * Subir imagen para galería/posts
 */
export async function uploadMediaImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.MEDIA,
    folder: userId,
    maxSizeMB: 5,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });
}

/**
 * Eliminar archivo de Storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: 'Error al eliminar el archivo',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      success: false,
      error: 'Error inesperado al eliminar el archivo',
    };
  }
}

/**
 * Obtener URL pública de un archivo
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Create a thumbnail URL using Next.js image optimization.
 * Works automatically with the built-in /_next/image loader —
 * no external service needed.
 */
export function createThumbnail(
  originalUrl: string,
  width: number = 200,
  _height: number = 200
): string {
  if (!originalUrl) return originalUrl;
  // Use Next.js image optimization endpoint for automatic resizing
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return `${siteUrl}/_next/image?url=${encodeURIComponent(originalUrl)}&w=${width}&q=75`;
}

/**
 * Subir múltiples archivos
 */
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadFile(file, options));
  return Promise.all(uploadPromises);
}

/**
 * Validar imagen antes de subir (client-side)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Verificar que sea imagen
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'El archivo debe ser una imagen' };
  }

  // Verificar tipo permitido
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato de imagen no soportado. Usa JPG, PNG, GIF o WebP',
    };
  }

  // Verificar tamaño (5MB por defecto)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `La imagen es muy grande (máximo 5MB)`,
    };
  }

  return { valid: true };
}

/**
 * Comprimir imagen antes de subir (básico, usa Canvas API)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Obtener información de un archivo en Storage
 */
export async function getFileInfo(bucket: StorageBucket, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) {
      console.error('Error getting file info:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}

/**
 * Configuración inicial de buckets (ejecutar una sola vez)
 */
export async function setupStorageBuckets() {
  const buckets = Object.values(STORAGE_BUCKETS);
  
  for (const bucket of buckets) {
    try {
      // Verificar si el bucket existe
      const { data: existing } = await supabase.storage.getBucket(bucket);
      
      if (!existing) {
        // Crear bucket si no existe
        const { error } = await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ALLOWED_IMAGE_TYPES,
        });

        if (error) {
          console.error(`Error creating bucket ${bucket}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error setting up bucket ${bucket}:`, error);
    }
  }
}
