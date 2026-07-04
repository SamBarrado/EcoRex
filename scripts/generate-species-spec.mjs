#!/usr/bin/env node
// Turns just "especie + Fractae" into a full ficha-spec via the Anthropic API
// (cheap/fast — same pattern the DinoDiscovery prototype used in
// functions/lib/anthropic.ts), ready to feed into generate-species-art.mjs.
//
// Usage:
//   node scripts/generate-species-spec.mjs "Stegosaurus" "Miedo"
//   node scripts/generate-species-spec.mjs "Velociraptor" "Sorpresa" --out scripts/lote.json --append

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FRACTAE = {
  alegria: { name: 'Alegría', latin: 'Lumen', color: 'amarillo/dorado', opposite: 'Tristeza (Tristitia)' },
  tristeza: { name: 'Tristeza', latin: 'Tristitia', color: 'azul', opposite: 'Alegría (Lumen)' },
  furia: { name: 'Furia', latin: 'Ira', color: 'rojo', opposite: 'Miedo (Pavor)' },
  miedo: { name: 'Miedo', latin: 'Pavor', color: 'morado', opposite: 'Furia (Ira)' },
  confianza: { name: 'Confianza', latin: 'Fides', color: 'verde', opposite: 'Asco (Fastidium)' },
  asco: { name: 'Asco', latin: 'Fastidium', color: 'verde oscuro', opposite: 'Confianza (Fides)' },
  sorpresa: { name: 'Sorpresa', latin: 'Stupor', color: 'naranja', opposite: 'Curiosidad (Spes)' },
  curiosidad: { name: 'Curiosidad', latin: 'Spes', color: 'lila', opposite: 'Sorpresa (Stupor)' },
};

function normalizeKey(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function resolveFractae(input) {
  const f = FRACTAE[normalizeKey(input)];
  if (!f) {
    throw new Error(
      `Fractae "${input}" no reconocido. Usa uno de: ${Object.values(FRACTAE).map((f) => f.name).join(', ')}`
    );
  }
  return f;
}

function loadDevVarsApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const devVarsPath = path.resolve('.dev.vars');
  if (!existsSync(devVarsPath)) return undefined;
  const line = readFileSync(devVarsPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  return line?.slice('ANTHROPIC_API_KEY='.length).trim() || undefined;
}

function buildPrompt(especie, fractae) {
  return `Eres el equipo de lore/diseño de bestiario de ECOREX. Cada criatura es la manifestación
física de un Fractae (núcleo emocional puro) a través de una especie portadora (dinosaurio), en
una de tres Fases: Calma, Furia o Eco (Fase ≠ Rareza, son ejes independientes; no asignes rareza).

Datos de entrada:
- Especie base (nombre científico real o parcial de dinosaurio): ${especie}
- Fractae asociado: ${fractae.name} (${fractae.latin}), color canónico: ${fractae.color}

Deriva TODO lo demás:
- scientificName: nombre científico completo y plausible (género + epíteto en latín), coherente
  con la especie base dada y con el Fractae.
- commonName: apodo corto en español, evocador, tono épico/misterioso (NO infantil-tierno, NO
  cursi), coherente con especie + Fractae.
- traits: 3-5 rasgos físicos fijos y concretos, derivados de la anatomía real de la especie base,
  estilizados para encajar con el Fractae.
- habitat: el hábitat/ecología REAL y concreto de la especie base (terrestre árido, semi-acuático
  fluvial, marino, boscoso templado, polar, etc.). Esto es clave: es lo que hará que la Fase Eco de
  esta especie no se parezca a la de otra especie con el mismo Fractae (docs/lore_world_bible_ecorex_v4.md §15.3).
  No lo generalices como "prehistórico": sé específico sobre el tipo de terreno/agua/clima.
- palette: colores ligados al color canónico del Fractae (${fractae.color}) combinados con tonos
  naturales de la especie.
- silhouette: una frase sobre postura/tipo de cuerpo.
- lorePhrase: una línea de lore, tono épico/misterioso.

Responde SOLO con un objeto JSON, sin texto adicional, sin markdown, con esta forma exacta:
{"scientificName": "...", "commonName": "...", "traits": "...", "habitat": "...", "palette": "...", "silhouette": "...", "lorePhrase": "..."}`;
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
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const textBlock = data.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('No text content in Anthropic response');

  const jsonText = textBlock.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(jsonText);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--append') args.append = true;
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [especie, fractaeInput] = args._;
  if (!especie || !fractaeInput) {
    console.error('Uso: node scripts/generate-species-spec.mjs "<especie>" "<Fractae>" [--out file.json] [--append]');
    console.error(`Fractae disponibles: ${Object.values(FRACTAE).map((f) => f.name).join(', ')}`);
    process.exit(1);
  }

  const apiKey = loadDevVarsApiKey();
  if (!apiKey) {
    console.error('Falta ANTHROPIC_API_KEY (env var o .dev.vars).');
    process.exit(1);
  }

  const fractae = resolveFractae(fractaeInput);
  console.log(`Generando ficha para "${especie}" / Fractae ${fractae.name} (${fractae.latin})...`);

  const result = await callClaude(buildPrompt(especie, fractae), apiKey);

  const spec = {
    scientificName: result.scientificName,
    commonName: result.commonName,
    fractae: { name: fractae.name, latin: fractae.latin },
    traits: result.traits,
    habitat: result.habitat,
    palette: result.palette,
    silhouette: result.silhouette,
    oppositeFractae: fractae.opposite,
    lorePhrase: result.lorePhrase,
  };

  console.log('\n--- FICHA ---');
  console.log(`Especie: ${spec.scientificName}`);
  console.log(`Nombre niño: "${spec.commonName}"`);
  console.log(`Fractae asociado: ${spec.fractae.name} (${spec.fractae.latin})`);
  console.log(`Rasgos físicos fijos: ${spec.traits}`);
  console.log(`Hábitat: ${spec.habitat}`);
  console.log(`Paleta base: ${spec.palette}`);
  console.log(`Silueta distintiva: ${spec.silhouette}`);
  console.log(`Oposición elemental: ${spec.oppositeFractae}`);
  console.log(`Frase de lore: ${spec.lorePhrase}`);
  console.log('-------------\n');

  const outPath = args.out ?? 'scripts/species.generated.json';
  let list = [];
  if (args.append && existsSync(outPath)) {
    list = JSON.parse(await readFile(outPath, 'utf8'));
  }
  list.push(spec);
  await writeFile(outPath, JSON.stringify(list, null, 2) + '\n');
  console.log(`Guardado en ${outPath} (${list.length} especie/s en el archivo).`);
  console.log(`Siguiente paso (aparte, de pago): npm run species:art -- ${outPath} --only "${spec.commonName}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
