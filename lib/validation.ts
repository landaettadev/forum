/**
 * Validación de formularios y datos del servidor
 * Utiliza Zod para validación tipada
 */

import { z } from 'zod';
import { sanitizeHtml, sanitizeUsername, validateEmail } from './sanitize';

// =============================================
// SCHEMAS DE VALIDACIÓN
// =============================================

// Registro de usuario
export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email muy corto')
    .max(100, 'Email muy largo')
    .refine((email) => validateEmail(email), 'Formato de email inválido'),
  
  username: z.string()
    .min(3, 'Usuario debe tener al menos 3 caracteres')
    .max(20, 'Usuario no puede exceder 20 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Usuario solo puede contener letras, números, guiones y guiones bajos')
    .transform((val) => sanitizeUsername(val)),
  
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña muy larga')
    .regex(/[a-z]/, 'Contraseña debe contener al menos una minúscula')
    .regex(/[A-Z]/, 'Contraseña debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Contraseña debe contener al menos un número'),
  
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Login
export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'Email requerido'),
  
  password: z.string()
    .min(1, 'Contraseña requerida'),
});

// Crear thread
export const createThreadSchema = z.object({
  forumId: z.string().uuid('ID de foro inválido'),
  
  title: z.string()
    .min(5, 'Título debe tener al menos 5 caracteres')
    .max(200, 'Título no puede exceder 200 caracteres')
    .transform((val) => val.trim()),
  
  content: z.string()
    .min(10, 'Contenido debe tener al menos 10 caracteres')
    .max(50000, 'Contenido no puede exceder 50000 caracteres')
    .transform((val) => sanitizeHtml(val)),
  
  isNsfw: z.boolean().optional().default(false),
});

// Crear post/respuesta
export const createPostSchema = z.object({
  threadId: z.string().uuid('ID de hilo inválido'),
  
  content: z.string()
    .min(1, 'Contenido no puede estar vacío')
    .max(50000, 'Contenido no puede exceder 50000 caracteres')
    .transform((val) => sanitizeHtml(val)),
  
  quotedPostId: z.string().uuid().optional(),
});

// Editar post
export const editPostSchema = z.object({
  postId: z.string().uuid('ID de post inválido'),

  content: z.string()
    .min(1, 'Contenido no puede estar vacío')
    .max(50000, 'Contenido no puede exceder 50000 caracteres')
    .transform((val) => sanitizeHtml(val)),
});

// Thank a post
export const thankPostSchema = z.object({
  postId: z.string().uuid('ID de post inválido'),
});

// Actualizar perfil
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Usuario debe tener al menos 3 caracteres')
    .max(20, 'Usuario no puede exceder 20 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Usuario solo puede contener letras, números, guiones y guiones bajos')
    .transform((val) => sanitizeUsername(val))
    .optional(),
  
  bio: z.string()
    .max(500, 'Biografía no puede exceder 500 caracteres')
    .transform((val) => val ? sanitizeHtml(val) : '')
    .optional(),
  
  signature: z.string()
    .max(200, 'Firma no puede exceder 200 caracteres')
    .transform((val) => val ? sanitizeHtml(val) : '')
    .optional(),
  
  location_country: z.string().max(100).optional(),
  location_city: z.string().max(100).optional(),
  avatar_url: z.string().url('URL de avatar inválida').optional(),
});

// Enviar mensaje privado
export const sendMessageSchema = z.object({
  toUserId: z.string().uuid('ID de usuario inválido'),
  
  subject: z.string()
    .min(1, 'Asunto requerido')
    .max(100, 'Asunto no puede exceder 100 caracteres')
    .transform((val) => val.trim()),
  
  content: z.string()
    .min(1, 'Contenido requerido')
    .max(10000, 'Contenido no puede exceder 10000 caracteres')
    .transform((val) => sanitizeHtml(val)),
});

// Crear reporte
export const createReportSchema = z.object({
  reportedUserId: z.string().uuid('ID de usuario inválido').optional(),
  postId: z.string().uuid('ID de post inválido').optional(),
  threadId: z.string().uuid('ID de hilo inválido').optional(),
  
  reason: z.enum([
    'spam',
    'harassment',
    'inappropriate',
    'illegal',
    'other',
  ], { errorMap: () => ({ message: 'Razón de reporte inválida' }) }),
  
  details: z.string()
    .min(10, 'Detalles deben tener al menos 10 caracteres')
    .max(1000, 'Detalles no pueden exceder 1000 caracteres')
    .transform((val) => sanitizeHtml(val)),
}).refine(
  (data) => data.reportedUserId || data.postId || data.threadId,
  { message: 'Debe especificar al menos un elemento a reportar' }
);

// Subir archivo
export const uploadFileSchema = z.object({
  file: z.instanceof(File),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isNsfw: z.boolean().optional().default(false),
}).refine((data) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(data.file.type);
}, {
  message: 'Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WebP)',
}).refine((data) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return data.file.size <= maxSize;
}, {
  message: 'Archivo muy grande. Máximo 5MB',
});

// Búsqueda
export const searchSchema = z.object({
  query: z.string()
    .min(2, 'Búsqueda debe tener al menos 2 caracteres')
    .max(100, 'Búsqueda no puede exceder 100 caracteres'),
  
  type: z.enum(['all', 'threads', 'posts', 'users']).optional().default('all'),
  
  page: z.coerce.number().min(1).optional().default(1),
});

// =============================================
// FUNCIONES DE VALIDACIÓN
// =============================================

/**
 * Valida datos con un schema de Zod y devuelve resultado tipado
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return { success: false, errors };
    }
    
    return {
      success: false,
      errors: { _form: ['Error de validación desconocido'] },
    };
  }
}

/**
 * Valida datos de forma asíncrona
 */
export async function validateDataAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string[]> }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return { success: false, errors };
    }
    
    return {
      success: false,
      errors: { _form: ['Error de validación desconocido'] },
    };
  }
}

/**
 * Extrae el primer error de cada campo
 */
export function getFieldErrors(errors: Record<string, string[]>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  for (const [field, messages] of Object.entries(errors)) {
    fieldErrors[field] = messages[0];
  }
  
  return fieldErrors;
}

/**
 * Formatea errores para mostrar en UI
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages: string[] = [];
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (field === '_form') {
      messages.push(...fieldErrors);
    } else {
      messages.push(`${field}: ${fieldErrors.join(', ')}`);
    }
  }
  
  return messages.join('\n');
}

// =============================================
// TIPOS EXPORTADOS
// =============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
