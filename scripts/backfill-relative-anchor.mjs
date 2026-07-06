#!/usr/bin/env node
// Backfills closestFamousRelative + distinguishingFromRelative onto existing
// ficha-specs (does NOT touch scientificName/commonName/traits/habitat/
// habitatSlug/silhouette/palette — those stay exactly as already curated).
// See docs/lore_world_bible_ecorex_v4.md §15.4.1 for why these fields exist.
//
// Usage: node scripts/backfill-relative-anchor.mjs scripts/lote.json

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fetchDinoDirectory, formatForPrompt as formatNhm } from './lib/dino-directory.mjs';
import { fetchDinosaurPicturesOrg, formatForPrompt as formatDpo } from './lib/dinosaur-pictures-org.mjs';

function loadDevVarsApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const devVarsPath = path.resolve('.dev.vars');
  if (!existsSync(devVarsPath)) return undefined;
  const line = readFileSync(devVarsPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  return line?.slice('ANTHROPIC_API_KEY='.length).trim() || undefined;
}

function buildPrompt(spec, realData) {
  const realDataBlock = realData
    ? `\nDatos reales verificados de la especie base:\n${realData}\n`
    : '\n(Sin datos verificados disponibles — usa tu mejor conocimiento general.)\n';

  return `Ya existe esta ficha de bestiario para ECOREX, NO la modifiques, solo añade dos campos.

Ficha existente (NO cambiar nada de esto):
- scientificName: ${spec.scientificName}
- commonName: ${spec.commonName}
- traits: ${spec.traits}
- habitat: ${spec.habitat}
- silhouette: ${spec.silhouette}
${realDataBlock}
Deriva SOLO estos dos campos nuevos:
- closestFamousRelative: el dinosaurio MUY conocido (T-Rex, Triceratops, Velociraptor, Stegosaurus,
  Brachiosaurus, Ankylosaurus, Parasaurolophus, etc.) cuyo plan corporal general (postura,
  proporciones, bípedo/cuadrúpedo, silueta) se parece más a esta especie base. Si hay datos reales
  de taxonomía arriba, úsalos para elegir con criterio real. Si la especie base YA es uno de los
  famosos, pon el mismo nombre.
- distinguishingFromRelative: qué rasgo(s) icónico(s) del pariente famoso esta especie NO tiene y
  hay que excluir explícitamente (para que un generador de imágenes no se los copie sin querer), y
  qué la diferencia concretamente. Sé factual y conservador; si no hay certeza razonable, di "sin
  diferencias notables conocidas".

Responde SOLO con un objeto JSON, sin texto adicional, sin markdown:
{"closestFamousRelative": "...", "distinguishingFromRelative": "..."}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaude(prompt, apiKey, retries = 4) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const bodyText = await response.text();
      const retryable = response.status === 529 || response.status === 429 || response.status >= 500;
      if (retryable && attempt < retries) {
        const backoffMs = 2000 * 2 ** attempt;
        console.log(`  (API ${response.status}, reintentando en ${backoffMs / 1000}s...)`);
        await sleep(backoffMs);
        continue;
      }
      throw new Error(`Anthropic API error: ${response.status} ${bodyText}`);
    }
    const data = await response.json();
    const textBlock = data.content.find((block) => block.type === 'text');
    if (!textBlock) throw new Error('No text content in Anthropic response');
    const jsonText = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(jsonText);
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/backfill-relative-anchor.mjs <species.json>');
    process.exit(1);
  }

  const apiKey = loadDevVarsApiKey();
  if (!apiKey) {
    console.error('Falta ANTHROPIC_API_KEY (env var o .dev.vars).');
    process.exit(1);
  }

  const specs = JSON.parse(await readFile(file, 'utf8'));
  let updated = 0;

  for (const spec of specs) {
    if (spec.closestFamousRelative && spec.distinguishingFromRelative) {
      console.log(`- ${spec.commonName}: ya tiene ambos campos, se salta.`);
      continue;
    }

    const genus = spec.scientificName.split(' ')[0];
    console.log(`Procesando ${spec.commonName} (${genus})...`);

    const [nhm, dpo] = await Promise.all([
      fetchDinoDirectory(genus).catch(() => null),
      fetchDinosaurPicturesOrg(genus).catch(() => null),
    ]);
    const realData = [formatNhm(nhm), formatDpo(dpo)].filter(Boolean).join('\n\n') || null;

    const result = await callClaude(buildPrompt(spec, realData), apiKey);
    spec.closestFamousRelative = result.closestFamousRelative;
    spec.distinguishingFromRelative = result.distinguishingFromRelative;
    updated++;
    console.log(`  -> pariente: ${result.closestFamousRelative}`);
    console.log(`  -> diferencias: ${result.distinguishingFromRelative}`);

    // Save incrementally so a crash halfway through doesn't lose progress.
    await writeFile(file, JSON.stringify(specs, null, 2) + '\n');
  }

  console.log(`\nListo. ${updated} ficha(s) actualizada(s) en ${file}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
