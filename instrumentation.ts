/**
 * Instrumentación de Next.js
 * Se ejecuta una vez cuando inicia el servidor
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Inicializar Sentry en el servidor
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Inicializar Sentry en edge runtime
    await import('./sentry.edge.config');
  }
}
