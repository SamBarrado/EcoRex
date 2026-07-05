#!/usr/bin/env node
// Batch-generates species anchor art: Calma via /v1/images/generations from a
// spec sheet, then Exceso and Eco via /v1/images/edits (image-to-image) over
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
  calma: 'forma estable, postura serena, iluminación natural suave',
  exceso: 'forma intensificada, postura agresiva, tensión muscular visible, brillo/grietas de energía más intensas en los rasgos elementales/cristalinos ya establecidos de la especie (si los tiene) y en ojos, sin convertir el resto del cuerpo en cristal si no lo era ya en Calma',
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

const PHASES = ['calma', 'exceso', 'eco'];

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

// Target style (confirmed against user-approved reference closeups): semi-
// stylized DIGITAL painted illustration with bold graphic linework and
// dramatic lighting — NOT photoreal/CGI, but also NOT flat/traditional-media
// gouache. Glow/energy accents (cracks, veins) are welcome and expected, but
// only where thematically justified by the creature's Fractae/habitat (e.g.
// molten cracks for a volcanic Furia/Ira creature) — never applied blindly
// as a universal "everything is crystal" treatment. Non-elemental surface
// materials (hide, scales, moss, stone) should look natural, not literal
// crystal/glass, rendered in the same illustrative digital-painting technique.
const BASE_STYLE = `GRAPHIC ANIME/MANGA-INFLUENCED ILLUSTRATION with heavy black ink contour linework — NOT a photograph, NOT a photoreal 3D/CGI render, NOT soft-blended airbrush painting, NOT physically-based-rendering skin detail. This must look like mobile-game/gacha creature card art or anime-style dinosaur illustration: a thick, clearly visible BLACK INK OUTLINE traces the silhouette AND traces the edge of every individual scale, plate, and major surface segment across the whole body — the linework is the dominant visual structure, not soft gradient blending. Color is filled in graphic, semi-flat cel-shaded blocks within those outlines — only 2-3 tonal steps per surface (shadow, midtone, highlight), not smooth photographic gradients. Reduce specular highlights: surfaces should look matte/painted, not glossy or wet-looking; avoid reflective sheen on the hide. Dramatic rim lighting and color grading are added on top of that flat/graphic base. If the ficha-spec's fixed physical traits explicitly call for crystalline/faceted features (e.g. a crystal frill or horns), render exactly those specific features as faceted glowing crystal — but the rest of the body (skin, scales, hide) must stay natural creature material with the same heavy-outline graphic technique, never a full-body glass/crystal transformation. Separately, where the creature's Fractae/habitat is elemental or intense (fire, lightning, decay, etc.), glowing cracks/veins in the Fractae's color may appear as graphic linework accents directly on the hide — but only where thematically justified, never as a blanket effect applied the same way to every species regardless of theme. Full dramatic environment matching the creature's habitat, painted in the same graphic illustration style, with real depth (foreground/midground/background). Dynamic imposing pose. No text, no watermark, no UI elements, no card frame or borders — deliver only the creature-and-environment illustration itself.`;

// Real figure/ground separation technique, not a cheap glow-outline hack:
// value contrast, atmospheric perspective and texture-density differences
// between subject and environment. Shared by Calma, Exceso and Eco because
// image-to-image edits tend to erode this separation over successive passes.
const FIGURE_GROUND_SEPARATION = `Achieve figure/ground separation through proper illustration technique: the creature is the sharpest, highest-contrast, most-detailed element in the frame. Push the background back with atmospheric perspective — softer edges, lower contrast, slightly desaturated and hazier the further back it goes. Do not render the background environment (rock, foliage, water, sky) with the same fine detail density as the creature's surface — it should read as a distinct, receding painted layer behind the subject, not competing with it for detail or contrast. The creature's silhouette must be immediately readable against its surroundings at a glance.`;

function buildAnchorPrompt(spec) {
  return [
    BASE_STYLE,
    FIGURE_GROUND_SEPARATION,
    `Species: ${spec.scientificName} ("${spec.commonName}").`,
    `Emotional core (Fractae): ${spec.fractae.name} (${spec.fractae.latin}) — let the environment's mood/lighting and a subtle accent in the eyes read as this element. Unless the fixed physical traits below explicitly describe crystalline/faceted features, the creature's body must stay natural creature material (skin/scales/hide), not a full-body stylized crystal/glass being.`,
    `Habitat/ecology: ${spec.habitat}.`,
    `Fixed physical traits: ${spec.traits}.`,
    `Base color palette: ${spec.palette}.`,
    `Distinctive silhouette: ${spec.silhouette}.`,
    `Phase (Calma, baseline/stable form): ${PHASE_MODIFIERS.calma}.`,
  ].join(' ');
}

function buildExcesoPrompt(spec) {
  return [
    `Same exact creature as the reference image — same species, same fixed physical traits, same base color palette, same silhouette, same graphic anime-influenced ink-lineart key-art style and same elemental environment: ${spec.scientificName} ("${spec.commonName}").`,
    `Apply ONLY this phase transformation (exceso): ${PHASE_MODIFIERS.exceso}.`,
    `This must NOT read as "the calm reference pose with the mouth open" — that is a failure state. Change the actual body pose/stance to something genuinely more aggressive and dynamic than the reference: crouched and lunging forward, weight shifted into an attack, claws/limbs raised or striking, a tighter and more dramatic camera angle/framing than the calm reference (closer, lower, or more diagonal — not the same wide standing profile shot). The mouth being open is a minor detail, not the main change.`,
    `Keep color saturation and contrast controlled and readable — this is a moderate intensification over the reference, not a blown-out, oversaturated, or overexposed image. Any glow accent should stay confined to the eyes and a few natural highlights (not a fictional crystal/crack pattern), not flood the entire frame or background in solid intense color. But the overall energy/danger must still be clearly, unmistakably higher than the calm reference — someone flipping between the two images should immediately feel escalation, not need to hunt for the difference.`,
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
    `Same exact creature as the reference image — same species, same fixed physical traits, same base color palette, same silhouette, same graphic anime-influenced ink-lineart key-art style: ${spec.scientificName} ("${spec.commonName}").`,
    `This is the Eco phase: the ${spec.fractae.name} (${spec.fractae.latin}) Fractae pushed to its absolute emotional extreme in this specific creature. The archetype of that extreme: ${extreme}.`,
    `Manifest that extreme specifically through THIS creature's own anatomy and habitat (${spec.habitat}) and physical traits (${spec.traits}) — do NOT default to a generic universal effect (no plain "translucent ghost" treatment applies to all species alike).`,
    `This must NOT read as "the calm reference pose with an effect overlaid on top" — that is a failure state, same as it would be for Exceso. This is the single most dramatic, extreme emotional moment this creature ever experiences: the body pose/stance must change accordingly (collapsing, recoiling, convulsing, frozen mid-motion, reaching/straining — whatever this specific extreme archetype implies for this creature) and the camera framing should be more dramatic/intimate than the calm reference, not the same static standing profile shot. The energy/lighting must read as clearly more intense or, where the archetype calls for it, deliberately darker/dimmer than both Calma and Exceso (e.g. a fear-extreme swallowed by darkness should get DARKER, not brighter) — pick whichever direction fits the specific Fractae archetype, don't default to "brighter and more glowing" for every case.`,
    `Reason about what mechanism this particular creature and environment would realistically produce, staying within the graphic illustration style (do not turn the whole body to crystal/glass unless that is already one of its fixed physical traits): an aquatic or semi-aquatic species should express it through water/steam/pressure/bioluminescence rather than dry fire or ash; a burrowing or heavily armored species might express it through earth, mud, or collapsing terrain; a flying or feathered species might express it through air, wind-scatter, or storm; a large land predator might express it through fire, ember, or scorched ground — pick whatever fits this species, not a template.`,
    `Keep the composition clean and restrained, not overloaded: the creature's silhouette must stay the clear, legible focal point. Use a moderate, controlled amount of environmental effect/particles concentrated where it matters rather than filling the whole frame with scattered debris or chaotic noise. Less is more — one or two clear focal details communicating the extreme beat a busy, cluttered image.`,
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
    console.error('Uso: node scripts/generate-species-art.mjs <species.json> [--out dir] [--only "Nombre niño"] [--phases calma,exceso,eco]');
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

    for (const phase of ['exceso', 'eco']) {
      if (!phases.includes(phase)) continue;
      console.log(`  Generando ${phase} (image-to-image sobre ancla Calma)...`);
      const prompt = phase === 'exceso' ? buildExcesoPrompt(spec) : buildEcoPrompt(spec);
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
