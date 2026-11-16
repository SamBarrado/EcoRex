#!/usr/bin/env node
// Generates the 3 default profile avatars (design/avatares/avatar-N.png, 1024x1024
// source) with the same OpenAI image model as the species art pipeline, then
// converts them to 256x256 WebP in public/avatars/ (what the app serves).
// Costs a real OpenAI call per avatar — run deliberately, not from other scripts.
//
// Usage: node scripts/generate-avatars.mjs [1|2|3 ...]   (default: all three)

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const STYLE = `GRAPHIC ANIME/MANGA-INFLUENCED ILLUSTRATION with heavy black ink contour linework — NOT a photograph, NOT a 3D render. Thick clearly visible black ink outlines, semi-flat cel-shaded color blocks with only 2-3 tonal steps, matte painted surfaces, dramatic rim lighting. Same visual language as mobile-game creature card art for a collectible dinosaur app. Square composition for a circular profile avatar: ONE single centered subject filling about 70% of the frame, generous even margin on all sides so a circular crop never cuts it, on a dark deep-forest-green radial gradient background (#0d1a0f at the edges to #1f5a33 near the subject) with a few soft glowing particles. No text, no letters, no watermark, no UI, no frame or border.`;

const AVATARS = {
  1: `${STYLE} Subject: the friendly, curious head-and-shoulders portrait of a baby Triceratops hatchling, facing the viewer with big bright eyes, small budding horns and a small frill with warm amber and emerald tones. Calm, welcoming expression (the "Balance" state).`,
  2: `${STYLE} Subject: a speckled dinosaur egg standing upright, with luminous cracks spreading across its shell and eight soft glows leaking out of the cracks in eight different emotion colors (gold, blue, red, violet, green, orange, lilac, cyan). Mysterious and promising — something is about to hatch.`,
  3: `${STYLE} Subject: a Tyrannosaurus skull in profile rendered as a faceted teal crystal artifact, with glowing teal veins running through it and small crystal shards floating around it. Powerful but elegant, like a collectible relic emblem.`,
};

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const p = path.resolve('.dev.vars');
  if (!existsSync(p)) return undefined;
  const line = readFileSync(p, 'utf8').split('\n').find((l) => l.startsWith('OPENAI_API_KEY='));
  return line?.slice('OPENAI_API_KEY='.length).trim() || undefined;
}

async function generate(prompt, apiKey) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, size: '1024x1024', quality: 'low' }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.data?.[0]?.b64_json) throw new Error('No image data in OpenAI response');
  return Buffer.from(data.data[0].b64_json, 'base64');
}

async function main() {
  const apiKey = loadKey();
  if (!apiKey) {
    console.error('Falta OPENAI_API_KEY (env var o .dev.vars).');
    process.exit(1);
  }
  const wanted = process.argv.slice(2).map(Number).filter((n) => AVATARS[n]);
  const ids = wanted.length ? wanted : Object.keys(AVATARS).map(Number);
  mkdirSync('design/avatares', { recursive: true });
  mkdirSync('public/avatars', { recursive: true });
  for (const n of ids) {
    console.log(`Generando avatar ${n}...`);
    const png = await generate(AVATARS[n], apiKey);
    await writeFile(`design/avatares/avatar-${n}.png`, png);
    await sharp(png).resize(256, 256).webp({ quality: 82 }).toFile(`public/avatars/avatar-${n}.webp`);
    console.log(`  -> design/avatares/avatar-${n}.png + public/avatars/avatar-${n}.webp`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
