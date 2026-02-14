/**
 * Script to generate PNG favicons from the SVG source.
 * 
 * Prerequisites: npm install sharp
 * Usage: node scripts/generate-favicons.mjs
 * 
 * This generates:
 *   - public/icon-192.png (192x192)
 *   - public/icon-512.png (512x512)
 *   - public/apple-touch-icon.png (180x180)
 *   - public/favicon.ico (32x32 PNG, works as ICO in modern browsers)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'));

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.ico', size: 32 },
];

async function generate() {
  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name));
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }
  console.log('\nDone! All favicons generated.');
}

generate().catch(console.error);
