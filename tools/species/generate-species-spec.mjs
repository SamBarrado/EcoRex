#!/usr/bin/env node
// Turns just "especie + Fractae" into a full ficha-spec via the Anthropic API
// (cheap/fast — same pattern the DinoDiscovery prototype used), ready to
// feed into generate-species-art.mjs.
//
// Usage:
//   node tools/species/generate-species-spec.mjs "Stegosaurus" "Miedo"
//   node tools/species/generate-species-spec.mjs "Velociraptor" "Sorpresa" --out tools/species/lote.json --append

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fetchDinoDirectory, formatForPrompt as formatNhm } from './lib/dino-directory.mjs';
import { fetchDinosaurPicturesOrg, formatForPrompt as formatDpo } from './lib/dinosaur-pictures-org.mjs';
import { fetchPbdbTaxon, formatForPrompt as formatPbdb } from './lib/pbdb.mjs';
import { FRACTAE, resolveFractae, buildPrompt, parseModelJson } from '../../shared/species-spec/prompt.mjs';

function loadDevVarsApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const devVarsPath = path.resolve('.dev.vars');
  if (!existsSync(devVarsPath)) return undefined;
  const line = readFileSync(devVarsPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  return line?.slice('ANTHROPIC_API_KEY='.length).trim() || undefined;
}

async function callClaude(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const textBlock = data.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('No text content in Anthropic response');

  return parseModelJson(textBlock.text);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--append') args.append = true;
    else if (a === '--edition') args.edition = argv[++i];
    else args._.push(a);
  }
  return args;
}

// Core logic, reusable from the CLI (main() below). Looks up real data from all
// three sources, calls the Anthropic API, and returns the ficha-spec —
// does NOT write to disk (callers decide what to do with the result).
export async function generateSpec(especie, fractaeInput, { apiKey, edition = '', onProgress = () => {} } = {}) {
  const fractae = resolveFractae(fractaeInput);
  const genus = especie.split(' ')[0];

  onProgress(`Consultando datos reales de "${genus}" (NHM Dino Directory + dinosaurpictures.org + PBDB)...`);
  const [nhm, dpo, pbdb] = await Promise.all([
    fetchDinoDirectory(genus).catch(() => null),
    fetchDinosaurPicturesOrg(genus).catch(() => null),
    fetchPbdbTaxon(genus).catch(() => null),
  ]);
  const realData = [formatNhm(nhm), formatDpo(dpo), formatPbdb(pbdb)].filter(Boolean).join('\n\n') || null;
  onProgress(
    realData
      ? 'Datos reales encontrados, se usarán como fuente de verdad para la ficha.'
      : 'Sin datos verificados para este género — la ficha se basará en el conocimiento general del modelo.'
  );

  const result = await callClaude(buildPrompt(especie, fractae, realData), apiKey);

  return {
    scientificName: result.scientificName,
    commonName: result.commonName,
    fractae: { name: fractae.name, latin: fractae.latin },
    traits: result.traits,
    habitat: result.habitat,
    palette: result.palette,
    silhouette: result.silhouette,
    closestFamousRelative: result.closestFamousRelative,
    distinguishingFromRelative: result.distinguishingFromRelative,
    oppositeFractae: fractae.opposite,
    lorePhrase: result.lorePhrase,
    edition,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [especie, fractaeInput] = args._;
  if (!especie || !fractaeInput) {
    console.error('Uso: node tools/species/generate-species-spec.mjs "<especie>" "<Fractae>" [--out file.json] [--append] [--edition "Wave 2"]');
    console.error(`Fractae disponibles: ${Object.values(FRACTAE).map((f) => f.name).join(', ')}`);
    process.exit(1);
  }

  const apiKey = loadDevVarsApiKey();
  if (!apiKey) {
    console.error('Falta ANTHROPIC_API_KEY (env var o .dev.vars).');
    process.exit(1);
  }

  console.log(`Generando ficha para "${especie}" / Fractae ${resolveFractae(fractaeInput).name}...`);
  const spec = await generateSpec(especie, fractaeInput, {
    apiKey,
    edition: args.edition ?? '',
    onProgress: (msg) => console.log(msg),
  });

  console.log('\n--- FICHA ---');
  console.log(`Especie: ${spec.scientificName}`);
  console.log(`Nombre niño: "${spec.commonName}"`);
  console.log(`Fractae asociado: ${spec.fractae.name} (${spec.fractae.latin})`);
  console.log(`Rasgos físicos fijos: ${spec.traits}`);
  console.log(`Hábitat: ${spec.habitat}`);
  console.log(`Paleta base: ${spec.palette}`);
  console.log(`Silueta distintiva: ${spec.silhouette}`);
  console.log(`Pariente famoso más cercano: ${spec.closestFamousRelative}`);
  console.log(`Diferencias con el pariente: ${spec.distinguishingFromRelative}`);
  console.log(`Oposición elemental: ${spec.oppositeFractae}`);
  console.log(`Frase de lore: ${spec.lorePhrase}`);
  console.log(`Wave/edición: ${spec.edition || '(sin asignar)'}`);
  console.log('-------------\n');

  const outPath = args.out ?? 'tools/species/species.generated.json';
  let list = [];
  if (args.append && existsSync(outPath)) {
    list = JSON.parse(await readFile(outPath, 'utf8'));
  }
  list.push(spec);
  await writeFile(outPath, JSON.stringify(list, null, 2) + '\n');
  console.log(`Guardado en ${outPath} (${list.length} especie/s en el archivo).`);
  console.log(`Siguiente paso (aparte, de pago): npm run species:art -- ${outPath} --only "${spec.commonName}"`);
}

const isMain = path.resolve(process.argv[1] ?? '') === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { loadDevVarsApiKey, FRACTAE, resolveFractae };
