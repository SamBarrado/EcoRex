#!/usr/bin/env node
// Converts public/species-art/{slug}/{phase}.png to sibling {phase}.webp
// (quality 82, same dimensions). Source PNGs are kept as-is (source-of-truth
// for regeneration); only the .webp is referenced by the DB/frontend. Run
// this after generating new art with generate-species-art.mjs and before
// db:sync-species.
import { readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ART_DIR = path.join(import.meta.dirname, '..', '..', 'public', 'species-art');
const PHASES = ['balance', 'exceso', 'eco'];

const slugs = (await readdir(ART_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

let converted = 0;
let savedBytes = 0;

for (const slug of slugs) {
  for (const phase of PHASES) {
    const pngPath = path.join(ART_DIR, slug, `${phase}.png`);
    const webpPath = path.join(ART_DIR, slug, `${phase}.webp`);
    if (!existsSync(pngPath)) continue;

    const beforeSize = statSync(pngPath).size;
    await sharp(pngPath).webp({ quality: 82 }).toFile(webpPath);
    const afterSize = statSync(webpPath).size;
    converted++;
    savedBytes += beforeSize - afterSize;
    console.log(`  ${slug}/${phase}: ${(beforeSize / 1024 / 1024).toFixed(2)}MB -> ${(afterSize / 1024 / 1024).toFixed(2)}MB`);
  }
}

console.log(`\nConverted ${converted} images, saved ${(savedBytes / 1024 / 1024).toFixed(1)}MB.`);
