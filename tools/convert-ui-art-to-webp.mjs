// Converts the heavy UI PNGs in public/ to resized WebP siblings (PNG kept as source).
// Run: node tools/convert-ui-art-to-webp.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

// [path without extension, max width (px)]
const TARGETS = [
  ["cards/sobre", 800],
  ["icons/carta-bloqueada", 480],
  ["icons/notificaciones", 256],
  ["icons/perfil", 256],
  ["logo/logo-ecorex", 768],
  ["icons/album", 410],
  ["icons/altar-fusion", 430],
  ["icons/percibir", 400],
  ["icons/mi-coleccion", 290],
];

async function main() {
  for (const [name, width] of TARGETS) {
    const src = `public/${name}.png`;
    const out = `public/${name}.webp`;
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
    console.log(`${name}: ${(statSync(src).size / 1024) | 0} KB -> ${(statSync(out).size / 1024) | 0} KB`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) main();
