'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ maxWidth: '42rem', textAlign: 'center' }}>
            <div style={{
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '6rem',
                height: '6rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg
                  style={{ width: '3rem', height: '3rem', color: '#ef4444' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
            }}>
              Error Crítico
            </h1>

            <p style={{
              fontSize: '1.125rem',
              color: '#94a3b8',
              marginBottom: '2rem',
            }}>
              Ha ocurrido un error crítico en la aplicación. Por favor, intenta recargar la página.
            </p>

            {error.digest && (
              <div style={{
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(51, 65, 85, 1)',
              }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  ID del error: <code style={{ fontFamily: 'monospace' }}>{error.digest}</code>
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
              >
                Intentar de nuevo
              </button>

              <a
                href="/"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#e2e8f0',
                  border: '1px solid rgba(51, 65, 85, 1)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'inline-block',
                }}
              >
                Volver al inicio
              </a>
            </div>

            <div style={{
              marginTop: '3rem',
              padding: '1.5rem',
              backgroundColor: 'rgba(30, 41, 59, 0.3)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(51, 65, 85, 1)',
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                marginBottom: '0.5rem',
              }}>
                Si el problema persiste, contacta con soporte técnico.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
