const createNextIntlPlugin = require('next-intl/plugin');
const fs = require('fs');
const path = require('path');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack(config, { isServer }) {
    // @react-email (resend dependency) tries to readFileSync a default-stylesheet.css
    // that doesn't exist during prerendering. Create it after compilation.
    if (isServer) {
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tap('CreateDefaultStylesheet', () => {
            const dir = path.join(compiler.outputPath, '..', 'browser');
            const file = path.join(dir, 'default-stylesheet.css');
            if (!fs.existsSync(file)) {
              fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(file, '');
            }
          });
        },
      });
    }
    return config;
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // CSP is set dynamically in middleware.ts with per-request nonce
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
