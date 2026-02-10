import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Ajustar sample rate según necesidad
  tracesSampleRate: 1.0,
  
  // Capturar errores en producción
  enabled: process.env.NODE_ENV === 'production',
  
  // Configuración de ambiente
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // Configuración de replay de sesiones (opcional)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Ignorar errores comunes que no son críticos
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
  ],
  
  // Filtrar información sensible
  beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
    // No enviar eventos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Remover datos sensibles de URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/password=[^&]*/gi, 'password=REDACTED');
      event.request.url = event.request.url.replace(/token=[^&]*/gi, 'token=REDACTED');
    }
    
    return event;
  },
});
