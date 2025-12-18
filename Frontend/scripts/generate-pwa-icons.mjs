// Script para generar iconos PWA en diferentes tamaños
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [192, 512];
const source = join(__dirname, '../public/logoCuidar.png');

console.log('🎨 Generando iconos PWA...\n');

for (const size of sizes) {
  const output = join(__dirname, `../public/pwa-${size}x${size}.png`);

  await sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 102, g: 126, b: 234, alpha: 1 } // #667eea
    })
    .png()
    .toFile(output);

  console.log(`✅ Generado: pwa-${size}x${size}.png`);
}

console.log('\n🎉 Todos los iconos PWA han sido generados exitosamente!');
