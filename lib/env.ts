import { z } from 'zod';

/**
 * Validación de variables de entorno con Zod
 * Se ejecuta al importar este módulo — falla rápido si faltan vars críticas
 */

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida'),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_TENOR_API_KEY: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((i) => `  ✗ ${i.path.join('.')}: ${i.message}`)
    .join('\n');

  console.error(
    '\n❌ Variables de entorno inválidas o faltantes:\n' +
    formatted +
    '\n\nRevisa tu archivo .env o .env.local\n'
  );

  // Only throw in build/production — allow dev to continue with warnings
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variables');
  }
}

export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WYP0TL8804',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://transforo.com',
  TENOR_API_KEY: process.env.NEXT_PUBLIC_TENOR_API_KEY || '',
  VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};
