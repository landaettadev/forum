import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  enabled: process.env.NODE_ENV === 'production',
  
  environment: process.env.NODE_ENV,
  
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // Capturar más contexto en el servidor
  integrations: [
    Sentry.httpIntegration(),
  ],
  
  beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Log del error en consola también
    console.error('Sentry captured error:', hint.originalException || hint.syntheticException);
    
    return event;
  },
});
