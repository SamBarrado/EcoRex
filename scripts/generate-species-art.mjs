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

// Widescreen landscape, matching the manually-designed anchors (e.g. the
// T-Rex Imperator reference is 1536x1024) — not the default square format.
const IMAGE_SIZE = '1536x1024';

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

const BASE_STYLE = `Stylized painted concept-art illustration (video-game bestiary key art) — deliberately NOT photorealistic: bold dark ink linework outlining every form, flatter posterized color blocks with painterly gradients instead of granular skin-pore/photo texture, slightly heroic/exaggerated proportions. Faceted, crystal-like scale texture with glowing internal veins/cracks running through the skin in the Fractae's accent color, but kept graphic/illustrative rather than hyper-detailed. Full dramatic environment matching the creature's element, rendered in the same stylized painted look as the creature. Cinematic rim lighting, one clear accent color for eyes and energy veins used with restraint (not blanket saturation across the whole image), dynamic imposing pose, a light/moderate amount of atmospheric particles drifting in the scene — not an overloaded or cluttered composition. No text, no watermark, no UI elements.`;

// Real figure/ground separation technique, not a cheap glow-outline hack:
// value contrast, atmospheric perspective and texture-density differences
// between subject and environment. Shared by Calma, Furia and Eco because
// image-to-image edits tend to erode this separation over successive passes.
const FIGURE_GROUND_SEPARATION = `Reserve the faceted, glowing-crack texture EXCLUSIVELY for the creature's skin — this exact graphic pattern must NEVER appear on the ground, rock, terrain, smoke, clouds, or any background surface, even if the environment is thematically the same material (e.g. volcanic/lava, ice, water). The environment may carry ambient color and light from its element (warm lava glow, cool ice sheen, etc.) as soft, diffuse illumination and color cast only — never as the same sharp crack-network graphic device used on the creature. If creature and terrain share a real-world material (e.g. a lava-skinned creature standing on lava rock, or smoke/clouds near it), differentiate them by TREATMENT, not material: the creature is graphic/faceted/glowing at full detail, everything else (ground, smoke, clouds, distant rock) is a plainer, softer, more uniform surface with far less linework and no repeated crack pattern — think "sharp painted character cutout over a simpler, softer painted backdrop", like classic hand-painted key art, not "creature and background made of the identical repeating texture".`;

function buildAnchorPrompt(spec) {
  return [
    BASE_STYLE,
    FIGURE_GROUND_SEPARATION,
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
    `This must NOT read as "the calm reference pose with the mouth open" — that is a failure state. Change the actual body pose/stance to something genuinely more aggressive and dynamic than the reference: crouched and lunging forward, weight shifted into an attack, claws/limbs raised or striking, a tighter and more dramatic camera angle/framing than the calm reference (closer, lower, or more diagonal — not the same wide standing profile shot). The mouth being open is a minor detail, not the main change.`,
    `Keep color saturation and contrast controlled and readable — this is a moderate intensification over the reference, not a blown-out, oversaturated, or overexposed image. The glow should be concentrated on the cracks/veins and a few key highlights, not flood the entire frame or background in solid intense color. But the overall energy/glow intensity must still be clearly, unmistakably higher than the calm reference — someone flipping between the two images should immediately feel escalation, not need to hunt for the difference.`,
    FIGURE_GROUND_SEPARATION,
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
    `This must NOT read as "the calm reference pose with an effect overlaid on top" — that is a failure state, same as it would be for Furia. This is the single most dramatic, extreme emotional moment this creature ever experiences: the body pose/stance must change accordingly (collapsing, recoiling, convulsing, frozen mid-motion, reaching/straining — whatever this specific extreme archetype implies for this creature) and the camera framing should be more dramatic/intimate than the calm reference, not the same static standing profile shot. The energy/lighting must read as clearly more intense or, where the archetype calls for it, deliberately darker/dimmer than both Calma and Furia (e.g. a fear-extreme swallowed by darkness should get DARKER, not brighter) — pick whichever direction fits the specific Fractae archetype, don't default to "brighter and more glowing" for every case.`,
    `Reason about what mechanism this particular creature and environment would realistically produce: an aquatic or semi-aquatic species should express it through water/steam/pressure/bioluminescence rather than dry fire or ash; a burrowing or heavily armored species might express it through earth, cracking stone, or collapsing structure; a flying or feathered species might express it through air, wind-scatter, or storm; a large land predator might express it through fire, ember, or scorched ground — pick whatever fits this species, not a template.`,
    `Keep the composition clean and restrained, not overloaded: the creature's silhouette must stay the clear, legible focal point. Use a moderate, controlled amount of debris/particles/effect concentrated where it matters (e.g. cracking origin points, the edges dissolving) rather than filling the whole frame with scattered fragments or chaotic noise. Less is more — one or two clear focal details communicating the extreme beat a busy, cluttered image.`,
    FIGURE_GROUND_SEPARATION,
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
      size: IMAGE_SIZE,
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
  form.append('size', IMAGE_SIZE);
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
