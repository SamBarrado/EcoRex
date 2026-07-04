#!/usr/bin/env node
// Batch-generates species anchor art: Calma via /v1/images/generations from a
// spec sheet, then Furia and Eco via /v1/images/edits (image-to-image) over
// the Calma anchor, so all three phases stay visually consistent per species
// as described in docs/lore_world_bible_ecorex_v4.md §15.2-15.4.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/generate-species-art.mjs species.json
//   node scripts/generate-species-art.mjs species.json --out especies_design/generated --only "Rex de Fuego"
//
// species.json is an array of ficha-spec objects, see species.example.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PHASE_MODIFIERS = {
  calma: 'forma estable, postura serena, brillo suave',
  furia: 'forma intensificada, postura agresiva, brillo ardiente, grietas de energía',
};

// Eco is the Fractae's emotion pushed to its absolute extreme — NOT a fixed
// universal "translucent ghost" effect. These are conceptual archetypes
// (what the emotion does to a creature at its breaking point), deliberately
// silent on mechanism/environment: buildEcoPrompt() combines each archetype
// with the specific species' own habitat + physical traits so the same
// Fractae manifests differently per species (docs/lore_world_bible_ecorex_v4.md §15.3).
const FRACTAE_EXTREME = {
  Alegría: 'desbordada por un júbilo tan absoluto que pierde el control de su propia forma física — euforia que la vuelve casi ingrávida y radiante, al borde de disolverse en su propia luz',
  Tristeza: 'hundida en un duelo tan profundo que pierde la capacidad de sostenerse a sí misma — se disuelve lentamente, cediendo su forma a su propio dolor',
  Furia: 'consumida por su propia rabia hasta el punto de autodestrucción — una energía descontrolada que fractura su cuerpo desde dentro',
  Miedo: 'devorada por el pánico hasta la disolución total — el instante final antes de desaparecer, cediendo ante un vacío que la consume por completo',
  Confianza: 'su convicción se vuelve absoluta e inamovible — se transforma en un monumento viviente, anclado para siempre a aquello en lo que cree',
  Asco: 'su propio rechazo la corroe desde dentro — se descompone en tiempo real, consumida por aquello que ella misma repudia',
  Sorpresa: 'el asombro la paraliza en un instante que se congela para siempre — fragmentada a mitad de un movimiento que nunca llega a completarse',
  Curiosidad: 'su obsesión por comprender la disuelve en incontables fragmentos que siguen buscando respuestas por separado, cada uno indagando su propia pregunta',
};

const PHASES = ['calma', 'furia', 'eco'];

function loadDevVarsApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const devVarsPath = path.resolve('.dev.vars');
  if (!existsSync(devVarsPath)) return undefined;
  const line = readFileSync(devVarsPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('OPENAI_API_KEY='));
  return line?.slice('OPENAI_API_KEY='.length).trim() || undefined;
}

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const BASE_STYLE = `Stylized painted concept-art illustration (video-game bestiary key art) — deliberately NOT photorealistic: bold dark ink linework outlining every form, flatter posterized color blocks with painterly gradients instead of granular skin-pore/photo texture, slightly heroic/exaggerated proportions. Faceted, crystal-like scale texture with glowing internal veins/cracks running through the skin in the Fractae's accent color, but kept graphic/illustrative rather than hyper-detailed. Full dramatic environment matching the creature's element, rendered in the same stylized painted look as the creature. Cinematic rim lighting, single vivid saturated accent color for eyes and energy veins, dynamic imposing pose, atmospheric particles drifting in the scene. No text, no watermark, no UI elements.`;

function buildAnchorPrompt(spec) {
  return [
    BASE_STYLE,
    `Species: ${spec.scientificName} ("${spec.commonName}").`,
    `Emotional core (Fractae): ${spec.fractae.name} (${spec.fractae.latin}) — the environment and glowing veins should read as this element.`,
    `Habitat/ecology: ${spec.habitat}.`,
    `Fixed physical traits: ${spec.traits}.`,
    `Base color palette: ${spec.palette}.`,
    `Distinctive silhouette: ${spec.silhouette}.`,
    `Phase (Calma, baseline/stable form): ${PHASE_MODIFIERS.calma}.`,
  ].join(' ');
}

function buildFuriaPrompt(spec) {
  return [
    `Same exact creature as the reference image — same species, same fixed physical traits, same base color palette, same silhouette, same stylized painted key-art style and same elemental environment: ${spec.scientificName} ("${spec.commonName}").`,
    `Apply ONLY this phase transformation (furia): ${PHASE_MODIFIERS.furia}.`,
    `Intensify the pose to open-mouthed roaring/attacking, darker and more violent lighting, more glowing cracks across the body.`,
    `Do not change the species identity, proportions, or palette family — only intensity/texture per the phase description.`,
  ].join(' ');
}

// Eco = the Fractae's emotion at its absolute extreme, manifested through
// THIS species' own anatomy and habitat — not a generic universal effect.
// Two species sharing a Fractae (e.g. a land apex predator and a marine
// reptile both under Furia) must NOT converge on the same visual solution.
function buildEcoPrompt(spec) {
  const extreme = FRACTAE_EXTREME[spec.fractae.name];
  return [
    `Same exact creature as the reference image — same species, same fixed physical traits, same base color palette, same silhouette, same stylized painted key-art style: ${spec.scientificName} ("${spec.commonName}").`,
    `This is the Eco phase: the ${spec.fractae.name} (${spec.fractae.latin}) Fractae pushed to its absolute emotional extreme in this specific creature. The archetype of that extreme: ${extreme}.`,
    `Manifest that extreme specifically through THIS creature's own anatomy and habitat (${spec.habitat}) and physical traits (${spec.traits}) — do NOT default to a generic universal effect (no plain "translucent ghost" treatment applies to all species alike).`,
    `Reason about what mechanism this particular creature and environment would realistically produce: an aquatic or semi-aquatic species should express it through water/steam/pressure/bioluminescence rather than dry fire or ash; a burrowing or heavily armored species might express it through earth, cracking stone, or collapsing structure; a flying or feathered species might express it through air, wind-scatter, or storm; a large land predator might express it through fire, ember, or scorched ground — pick whatever fits this species, not a template.`,
    `The result should read as the climactic, most extreme possible state of this exact creature's emotion — dramatic and singular to it, not interchangeable with any other species' Eco.`,
  ].join(' ');
}

async function generateAnchor(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error (generations): ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  if (!data.data?.[0]?.b64_json) throw new Error('No image data in OpenAI response');
  return data.data[0].b64_json;
}

async function generateVariant(anchorBytes, prompt, apiKey) {
  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('image', new Blob([anchorBytes], { type: 'image/png' }), 'anchor.png');
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', '1024x1024');
  form.append('quality', 'low');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error (edits): ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  if (!data.data?.[0]?.b64_json) throw new Error('No image data in OpenAI response');
  return data.data[0].b64_json;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--phases') args.phases = argv[++i].split(',');
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const specFile = args._[0];
  if (!specFile) {
    console.error('Uso: node scripts/generate-species-art.mjs <species.json> [--out dir] [--only "Nombre niño"] [--phases calma,furia,eco]');
    process.exit(1);
  }

  const apiKey = loadDevVarsApiKey();
  if (!apiKey) {
    console.error('Falta OPENAI_API_KEY (env var o .dev.vars).');
    process.exit(1);
  }

  const specs = JSON.parse(await readFile(specFile, 'utf8'));
  const outDir = args.out ?? 'especies_design/generated';
  const phases = args.phases ?? PHASES;

  for (const spec of specs) {
    if (args.only && spec.commonName !== args.only) continue;

    const speciesDir = path.join(outDir, slugify(spec.commonName));
    await mkdir(speciesDir, { recursive: true });
    console.log(`\n=== ${spec.commonName} (${spec.scientificName}) ===`);

    let anchorBytes;
    if (phases.includes('calma')) {
      console.log('  Generando ancla Calma...');
      const b64 = await generateAnchor(buildAnchorPrompt(spec), apiKey);
      anchorBytes = Buffer.from(b64, 'base64');
      await writeFile(path.join(speciesDir, 'calma.png'), anchorBytes);
      console.log(`  -> ${speciesDir}/calma.png`);
    } else {
      // Reusing an already-curated Calma anchor as the base for edits.
      const existing = path.join(speciesDir, 'calma.png');
      if (!existsSync(existing)) {
        console.error(`  Falta ${existing} para generar otras fases sin regenerar Calma. Sáltate --phases o genera Calma primero.`);
        continue;
      }
      anchorBytes = await readFile(existing);
    }

    for (const phase of ['furia', 'eco']) {
      if (!phases.includes(phase)) continue;
      console.log(`  Generando ${phase} (image-to-image sobre ancla Calma)...`);
      const prompt = phase === 'furia' ? buildFuriaPrompt(spec) : buildEcoPrompt(spec);
      const b64 = await generateVariant(anchorBytes, prompt, apiKey);
      await writeFile(path.join(speciesDir, `${phase}.png`), Buffer.from(b64, 'base64'));
      console.log(`  -> ${speciesDir}/${phase}.png`);
    }
  }

  console.log('\nListo. Revisa y cura manualmente antes de subir a R2 / registrar en species_phase_anchors (docs/lore_world_bible_ecorex_v4.md §15.4).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
