#!/usr/bin/env node
// Turns just "especie + Fractae" into a full ficha-spec via the Anthropic API
// (cheap/fast — same pattern the DinoDiscovery prototype used), ready to
// feed into generate-species-art.mjs.
//
// Usage:
//   node scripts/generate-species-spec.mjs "Stegosaurus" "Miedo"
//   node scripts/generate-species-spec.mjs "Velociraptor" "Sorpresa" --out scripts/lote.json --append

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fetchDinoDirectory, formatForPrompt as formatNhm } from './lib/dino-directory.mjs';
import { fetchDinosaurPicturesOrg, formatForPrompt as formatDpo } from './lib/dinosaur-pictures-org.mjs';
import { fetchPbdbTaxon, formatForPrompt as formatPbdb } from './lib/pbdb.mjs';

export const FRACTAE = {
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

export function resolveFractae(input) {
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

function buildPrompt(especie, fractae, realData) {
  const realDataBlock = realData
    ? `\nDATOS REALES VERIFICADOS (usa esto como fuente de verdad por encima de tu propio conocimiento — si hay conflicto, estos datos ganan):\n${realData}\n`
    : `\n(No se encontraron datos verificados de esta especie en las bases de datos consultadas — usa tu mejor conocimiento general, pero sé conservador y no inventes detalles muy específicos.)\n`;

  return `Eres el equipo de lore/diseño de bestiario de ECOREX. Cada criatura es la manifestación
física de un Fractae (núcleo emocional puro) a través de una especie portadora (dinosaurio), en
una de tres Fases: Balance, Exceso o Eco (Fase ≠ Rareza, son ejes independientes; no asignes rareza).

Datos de entrada:
- Especie base (nombre científico real o parcial de dinosaurio): ${especie}
- Fractae asociado: ${fractae.name} (${fractae.latin}), color canónico: ${fractae.color}
${realDataBlock}
Deriva TODO lo demás:
- scientificName: nombre científico completo y plausible (género + epíteto en latín), coherente
  con la especie base dada y con el Fractae.
- commonName: apodo corto en español, evocador, tono épico/misterioso (NO infantil-tierno, NO
  cursi), coherente con especie + Fractae.
- traits: 3-5 rasgos físicos fijos y concretos. Si hay datos reales verificados arriba, básalos
  en la taxonomía/forma corporal/dieta real (ej. si dice "Ornithopoda, walked on four legs",
  refleja eso); si no hay datos, usa tu mejor conocimiento general de la anatomía real de la
  especie base. Estilízalos para encajar con el Fractae, pero sin contradecir la anatomía/
  comportamiento real (ej. no le des garras de ataque a un herbívoro de pico de pato).
- habitat: el hábitat/ecología REAL y concreto de la especie base (terrestre árido, semi-acuático
  fluvial, marino, boscoso templado, polar, etc.) — usa el periodo/países/tipo de hábitat de los
  datos reales si están disponibles. Esto es clave: es lo que hará que la Fase Eco de esta especie
  no se parezca a la de otra especie con el mismo Fractae (docs/lore_world_bible_ecorex_v4.md §15.3).
  No lo generalices como "prehistórico": sé específico sobre el tipo de terreno/agua/clima.
- palette: colores ligados al color canónico del Fractae (${fractae.color}) combinados con tonos
  naturales de la especie.
- silhouette: una frase sobre postura/tipo de cuerpo, coherente con la locomoción/forma corporal
  real si hay datos disponibles (bípedo/cuadrúpedo, depredador/herbívoro, etc.).
- closestFamousRelative: el dinosaurio MUY conocido (T-Rex, Triceratops, Velociraptor,
  Stegosaurus, Brachiosaurus, Ankylosaurus, Parasaurolophus, etc.) cuyo plan corporal general
  (postura, proporciones, tipo bípedo/cuadrúpedo, silueta) se parece más a esta especie base. Si
  hay datos reales de taxonomía arriba (ej. "Thyreophora,Stegosauria"), úsalos para elegir el
  pariente correcto con criterio real, no solo por intuición. Esto es clave para especies poco
  conocidas: sirve de ancla anatómica en el prompt de imagen, porque el modelo de imagen tiene un
  prior visual mucho más fuerte para los dinosaurios famosos y tiende a "derivar" hacia ellos
  (normalmente hacia un terópodo tipo raptor) si no se le da esta ancla explícita. Si la especie
  base YA es uno de los famosos, pon el mismo nombre.
- distinguishingFromRelative: CRÍTICO — nombrar solo el pariente famoso es peligroso, porque el
  modelo de imagen puede copiarle rasgos icónicos que esta especie NO tiene (ej. decir "como un
  Parasaurolophus" puede hacer que le añada la cresta tubular a un Telmatosaurus, que no la tiene).
  Aquí debes listar explícitamente, usando tu conocimiento paleontológico real (no las bases de
  datos, que no llegan a este nivel de detalle): (a) qué rasgo(s) icónico(s) del pariente famoso
  esta especie NO tiene y hay que excluir explícitamente, y (b) qué la diferencia concretamente
  (tamaño, cresta o ausencia de ella, forma del cráneo, armadura, etc.). Sé concreto y factual, no
  inventes si no lo sabes con razonable certeza — en ese caso di "sin diferencias craneales
  notables conocidas" en vez de inventar.
- lorePhrase: una línea de lore, tono épico/misterioso.

Responde SOLO con un objeto JSON, sin texto adicional, sin markdown, con esta forma exacta:
{"scientificName": "...", "commonName": "...", "traits": "...", "habitat": "...", "palette": "...", "silhouette": "...", "closestFamousRelative": "...", "distinguishingFromRelative": "...", "lorePhrase": "..."}`;
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
    else if (a === '--edition') args.edition = argv[++i];
    else args._.push(a);
  }
  return args;
}

// Core logic, reusable from the CLI (main() below) and from
// scripts/discover-species-pbdb.mjs's web UI. Looks up real data from all
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
    console.error('Uso: node scripts/generate-species-spec.mjs "<especie>" "<Fractae>" [--out file.json] [--append] [--edition "Wave 2"]');
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

const isMain = path.resolve(process.argv[1] ?? '') === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { loadDevVarsApiKey };
