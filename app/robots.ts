import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsrating.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/mi-cuenta/',
          '/cuenta/',
          '/mensajes/',
          '/notificaciones/',
          '/alertas/',
          '/favoritos/',
          '/nuevo-hilo/',
          '/verificacion/',
          '/recuperar-contrasena/',
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/mi-cuenta/',
          '/cuenta/',
          '/mensajes/',
          '/notificaciones/',
          '/alertas/',
          '/favoritos/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
