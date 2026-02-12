import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TransForo — Trans Community Forum';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4c1d95 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, marginBottom: 16 }}>
          TransForo
        </div>
        <div style={{ fontSize: 28, opacity: 0.85, maxWidth: 800, textAlign: 'center' }}>
          Foro de escorts trans — reseñas, opiniones y experiencias reales.
        </div>
      </div>
    ),
    { ...size }
  );
}
