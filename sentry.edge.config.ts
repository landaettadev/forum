import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: 1.0,
  
  enabled: process.env.NODE_ENV === 'production',
  
  environment: process.env.NODE_ENV,
  
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
});
