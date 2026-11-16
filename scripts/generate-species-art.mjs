#!/usr/bin/env node
// Batch-generates species anchor art: Balance via /v1/images/generations from a
// spec sheet, then Exceso and Eco via /v1/images/edits (image-to-image) over
// the Balance anchor, so all three phases stay visually consistent per species
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
  balance: 'forma estable, postura serena, iluminación natural suave',
  exceso: 'forma intensificada, tensión muscular visible, postura de máxima intensidad emocional adaptada al comportamiento real de la especie (ataque si es depredador; carga defensiva, alarde territorial o huida explosiva si no lo es — nunca una pose de ataque depredador en una especie que no lo es), brillo/grietas de energía más intensas en los rasgos elementales/cristalinos ya establecidos de la especie (si los tiene) y en ojos, sin convertir el resto del cuerpo en cristal si no lo era ya en Balance',
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

const PHASES = ['balance', 'exceso', 'eco'];

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

export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Public-domain/CC life-restoration reference images per famous relative, used
// as an image-to-image anchor for Balance so anatomy comes from real pixels
// instead of the model's (often weak) visual prior for lesser-known species.
// See docs/lore_world_bible_ecorex_v4.md §15.4.1.
const REFERENCE_ANATOMY_DIR = 'reference-anatomy';

function referenceRelativeSlug(name) {
  const key = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  if (key === 't-rex' || key === 'tyrannosaurus rex' || key === 'tyrannosaurus') {
    return 'tyrannosaurus';
  }
  return slugify(name);
}

function findReferenceBySlug(slug) {
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const p = path.join(REFERENCE_ANATOMY_DIR, `${slug}${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

// Prefer a reference of the actual base species (real anatomy, no
// approximation needed) over one of its closestFamousRelative (an
// anatomical stand-in used only when the real species has no reference).
export function findReferenceImage(spec) {
  const genus = spec.scientificName?.split(' ')[0];
  if (genus) {
    const ownRef = findReferenceBySlug(slugify(genus));
    if (ownRef) return { path: ownRef, isOwnSpecies: true };
  }
  if (spec.closestFamousRelative) {
    const relativeRef = findReferenceBySlug(referenceRelativeSlug(spec.closestFamousRelative));
    if (relativeRef) return { path: relativeRef, isOwnSpecies: false };
  }
  return null;
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
// between subject and environment. Shared by Balance, Exceso and Eco because
// image-to-image edits tend to erode this separation over successive passes.
const FIGURE_GROUND_SEPARATION = `Achieve figure/ground separation through proper illustration technique: the creature is the sharpest, highest-contrast, most-detailed element in the frame. Push the background back with atmospheric perspective — softer edges, lower contrast, slightly desaturated and hazier the further back it goes. Do not render the background environment (rock, foliage, water, sky) with the same fine detail density as the creature's surface — it should read as a distinct, receding painted layer behind the subject, not competing with it for detail or contrast. The creature's silhouette must be immediately readable against its surroundings at a glance.`;

// The creature must feel like it's engaging the viewer/player, not a flat
// side-profile reference shot. A plain full-body walk-cycle silhouette in
// strict profile reads as static/lifeless no matter how dramatic the
// lighting is — the fix is camera angle + gaze + action directed at camera,
// not just adding motion blur or effects.
const TOWARD_VIEWER_ENGAGEMENT = `The creature must be captured mid-action, actively engaging toward the viewer/camera — NOT a flat, static, full-body side-profile silhouette (like a museum reference plate or a walk-cycle sprite). Use a three-quarter angle or a more confrontational/dynamic camera angle (slightly low, looking up at the creature, or an angle that shows depth through the body rather than a flat side elevation). The creature's head/gaze and body language should be oriented toward the viewer/camera, as if reacting to the player's presence — looking directly out of the frame, lunging toward camera, or performing its action (roaring, stalking, recoiling) in the viewer's direction rather than parallel to the picture plane. Show a real sense of weight and motion in the pose, not a posed/idle stance.`;

// For lesser-known species the image model has a weak visual prior and
// tends to drift the whole body toward whatever famous dinosaur shape it
// remembers best (usually a raptor/theropod) once the pose changes a lot.
// Anchoring explicitly to a well-known relative's body plan fixes this at
// the source, instead of only telling the model what NOT to do.
function relativeAnchorLine(spec) {
  if (!spec.closestFamousRelative) return '';
  const parts = [
    `ANATOMY ANCHOR (critical for a lesser-known species): this animal's overall body plan is essentially identical to ${spec.closestFamousRelative} — same stance, same proportions of torso/legs/tail, same general silhouette type. Apply ONLY the specific differences described in its own fixed physical traits and silhouette above; if in doubt, default to the ${spec.closestFamousRelative} body plan rather than inventing a different one.`,
  ];
  if (spec.distinguishingFromRelative) {
    parts.push(`IMPORTANT — do NOT copy ${spec.closestFamousRelative}'s most iconic features blindly: ${spec.distinguishingFromRelative}. Naming a famous relative is only an anchor for the general body plan, not permission to add that relative's signature features (crests, horn arrangements, armor patterns, etc.) if this species doesn't actually have them.`);
  }
  return parts.join(' ');
}

export function buildAnchorPrompt(spec) {
  return [
    BASE_STYLE,
    FIGURE_GROUND_SEPARATION,
    TOWARD_VIEWER_ENGAGEMENT,
    `Species: ${spec.scientificName} ("${spec.commonName}").`,
    `Emotional core (Fractae): ${spec.fractae.name} (${spec.fractae.latin}) — let the environment's mood/lighting and a subtle accent in the eyes read as this element. Unless the fixed physical traits below explicitly describe crystalline/faceted features, the creature's body must stay natural creature material (skin/scales/hide), not a full-body stylized crystal/glass being.`,
    `Habitat/ecology: ${spec.habitat}.`,
    `Fixed physical traits: ${spec.traits}.`,
    `Base color palette: ${spec.palette}.`,
    `Distinctive silhouette: ${spec.silhouette}.`,
    relativeAnchorLine(spec),
    `Phase (Balance, baseline/stable form): ${PHASE_MODIFIERS.balance}.`,
  ].join(' ');
}

// Used instead of buildAnchorPrompt() when a real life-restoration reference
// image exists (see findReferenceImage()) — either of the base species
// itself, or of its closestFamousRelative as an anatomical stand-in. The
// reference image supplies real anatomy/pose/proportions as pixels — this
// prompt asks for a restyle + the SPECIFIC listed additions, rather than
// describing the whole creature from scratch in text (which is what caused
// anatomical drift for lesser-known species in the first place).
export function buildRestylePrompt(spec, referenceInfo) {
  const referenceIntro = referenceInfo.isOwnSpecies
    ? `The attached reference image is an accurate scientific life-restoration of the real base species behind ${spec.scientificName} ("${spec.commonName}") — same body plan, stance and proportions.`
    : `The attached reference image is an accurate scientific life-restoration of ${spec.closestFamousRelative}, this species' closest famous relative — same general body plan, stance and proportions as ${spec.scientificName} ("${spec.commonName}").`;
  const task = referenceInfo.isOwnSpecies
    ? `TASK: restyle this reference into the target illustration style described below, KEEPING the same pose, camera angle, body proportions, limb structure and silhouette as the reference image — do not reinterpret the pose or invent a different body plan. Then ADD ONLY the specific fantastical/elemental traits listed below on top of this real anatomy (this is the ECOREX game version of the real animal); do not otherwise alter the real body shape.`
    : `TASK: restyle this reference into the target illustration style described below, KEEPING the same pose, camera angle, body proportions, limb structure and silhouette as the reference image — do not reinterpret the pose or invent a different body plan. Then apply ONLY the specific physical differences listed below to turn it from ${spec.closestFamousRelative} into this actual species.`;
  const traitsLabel = referenceInfo.isOwnSpecies
    ? `Fixed physical traits — add these on top of the reference's real anatomy, keep everything else about the reference's body plan unchanged: ${spec.traits}.`
    : `Fixed physical traits — apply these specific differences from the reference's default anatomy, keep everything else about the reference's body plan unchanged: ${spec.traits}.`;
  return [
    referenceIntro,
    task,
    BASE_STYLE,
    FIGURE_GROUND_SEPARATION,
    TOWARD_VIEWER_ENGAGEMENT,
    `Emotional core (Fractae): ${spec.fractae.name} (${spec.fractae.latin}) — let the environment's mood/lighting and a subtle accent in the eyes read as this element. Unless the fixed physical traits below explicitly describe crystalline/faceted features, the creature's body must stay natural creature material (skin/scales/hide), not a full-body stylized crystal/glass being.`,
    `Habitat/ecology to paint as the environment (replacing whatever plain/white background the reference has): ${spec.habitat}.`,
    traitsLabel,
    `Base color palette: ${spec.palette}.`,
    `Distinctive silhouette (should already mostly match the reference; only adjust what these differences require): ${spec.silhouette}.`,
    !referenceInfo.isOwnSpecies && spec.distinguishingFromRelative
      ? `IMPORTANT — differences from ${spec.closestFamousRelative} to apply: ${spec.distinguishingFromRelative}. Do not keep ${spec.closestFamousRelative}'s signature features where this species doesn't have them.`
      : '',
    `Phase (Balance, baseline/stable form): ${PHASE_MODIFIERS.balance}.`,
  ].filter(Boolean).join(' ');
}

export function buildExcesoPrompt(spec) {
  return [
    `Same exact creature as the reference image — same species, same base color palette, same silhouette, same graphic anime-influenced ink-lineart key-art style and same elemental environment: ${spec.scientificName} ("${spec.commonName}").`,
    `CRITICAL — preserve exact anatomy, do not reinterpret the species: ${spec.traits}. Distinctive silhouette to preserve: ${spec.silhouette}. This means the ENTIRE body plan — head/skull shape, torso/body proportions, limb length and structure, stance (bipedal/quadrupedal/facultative), tail shape and length — must stay recognizably identical to the reference, not just the most distinctive single feature. Especially for less iconic/lesser-known species, the reference image alone is not enough anchor — the model tends to drift the whole body toward a generic "cool dinosaur" shape (often theropod-like) when the pose changes a lot. Explicitly resist that: keep the same overall proportions and body type as the reference even while changing the pose dramatically. If in doubt, favor fidelity to these traits over dramatic reinterpretation.`,
    relativeAnchorLine(spec),
    `Apply ONLY this phase transformation (exceso): ${PHASE_MODIFIERS.exceso}.`,
    `This must NOT read as "the calm reference pose with the mouth open" — that is a failure state. Change the actual body pose/stance to something genuinely more intense and dynamic than the reference, but the SPECIFIC action must fit THIS creature's real anatomy and behavior, not a generic predator-attack pose: a predator (sharp teeth, claws built for hunting) can lunge/attack with claws raised; a herbivore or non-predatory species (duck-bill, blunt beak, no hunting claws, armored/slow-moving body, etc.) should instead express intensity through its own real repertoire — a defensive charge, a territorial/threat display, rearing up to look bigger, an explosive startled bolt, a defensive tail-whip — NEVER a predatory lunge with claws that its real anatomy doesn't support, since forcing that pose is exactly what causes the model to reinterpret the whole creature as a different, predator-shaped species. Use a tighter and more dramatic camera angle/framing than the calm reference (closer, lower, or more diagonal — not the same wide standing profile shot). The mouth being open is a minor detail, not the main change.`,
    TOWARD_VIEWER_ENGAGEMENT,
    `Keep color saturation and contrast controlled and readable — this is a moderate intensification over the reference, not a blown-out, oversaturated, or overexposed image. Any glow accent should stay confined to the eyes and a few natural highlights (not a fictional crystal/crack pattern), not flood the entire frame or background in solid intense color. But the overall energy/danger must still be clearly, unmistakably higher than the calm reference — someone flipping between the two images should immediately feel escalation, not need to hunt for the difference.`,
    FIGURE_GROUND_SEPARATION,
    `Do not change the species identity, proportions, or palette family — only intensity/texture per the phase description.`,
  ].join(' ');
}

// Eco = the Fractae's emotion at its absolute extreme, manifested through
// THIS species' own anatomy and habitat — not a generic universal effect.
// Two species sharing a Fractae (e.g. a land apex predator and a marine
// reptile both under Furia) must NOT converge on the same visual solution.
export function buildEcoPrompt(spec) {
  const extreme = FRACTAE_EXTREME[spec.fractae.name];
  return [
    `Same exact creature as the reference image — same species, same base color palette, same silhouette, same graphic anime-influenced ink-lineart key-art style: ${spec.scientificName} ("${spec.commonName}").`,
    `CRITICAL — preserve exact anatomy, do not reinterpret the species: ${spec.traits}. Distinctive silhouette to preserve: ${spec.silhouette}. This means the ENTIRE body plan — head/skull shape, torso/body proportions, limb length and structure, stance, tail shape and length — must stay recognizably identical to the reference, not just the most distinctive single feature. Especially for less iconic/lesser-known species, the reference image alone is not enough anchor — the model tends to drift the whole body toward a generic "cool dinosaur" shape (often theropod-like) when the pose changes a lot. Explicitly resist that: even mid-collapse or mid-dissolution, the remaining recognizable parts of the creature must keep the same overall proportions and body type as the reference.`,
    relativeAnchorLine(spec),
    `This is the Eco phase: the ${spec.fractae.name} (${spec.fractae.latin}) Fractae pushed to its absolute emotional extreme in this specific creature. The archetype of that extreme: ${extreme}.`,
    `Manifest that extreme specifically through THIS creature's own anatomy and habitat (${spec.habitat}) and physical traits (${spec.traits}) — do NOT default to a generic universal effect (no plain "translucent ghost" treatment applies to all species alike).`,
    `This must NOT read as "the calm reference pose with an effect overlaid on top" — that is a failure state, same as it would be for Exceso. This is the single most dramatic, extreme emotional moment this creature ever experiences: the body pose/stance must change accordingly (collapsing, recoiling, convulsing, frozen mid-motion, reaching/straining — whatever this specific extreme archetype implies for this creature) and the camera framing should be more dramatic/intimate than the calm reference, not the same static standing profile shot. The energy/lighting must read as clearly more intense or, where the archetype calls for it, deliberately darker/dimmer than both Balance and Exceso (e.g. a fear-extreme swallowed by darkness should get DARKER, not brighter) — pick whichever direction fits the specific Fractae archetype, don't default to "brighter and more glowing" for every case.`,
    `Reason about what mechanism this particular creature and environment would realistically produce, staying within the graphic illustration style (do not turn the whole body to crystal/glass unless that is already one of its fixed physical traits): an aquatic or semi-aquatic species should express it through water/steam/pressure/bioluminescence rather than dry fire or ash; a burrowing or heavily armored species might express it through earth, mud, or collapsing terrain; a flying or feathered species might express it through air, wind-scatter, or storm; a large land predator might express it through fire, ember, or scorched ground — pick whatever fits this species, not a template.`,
    `Keep the composition clean and restrained, not overloaded: the creature's silhouette must stay the clear, legible focal point. Use a moderate, controlled amount of environmental effect/particles concentrated where it matters rather than filling the whole frame with scattered debris or chaotic noise. Less is more — one or two clear focal details communicating the extreme beat a busy, cluttered image.`,
    TOWARD_VIEWER_ENGAGEMENT,
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
    console.error('Uso: node scripts/generate-species-art.mjs <species.json> [--out dir] [--only "Nombre niño"] [--phases balance,exceso,eco]');
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
    if (phases.includes('balance')) {
      const referenceInfo = findReferenceImage(spec);
      let b64;
      if (referenceInfo) {
        const kind = referenceInfo.isOwnSpecies ? 'especie real' : 'pariente famoso';
        console.log(`  Generando ancla Balance (restyle sobre referencia real de ${kind}: ${referenceInfo.path})...`);
        const referenceBytes = await readFile(referenceInfo.path);
        b64 = await generateVariant(referenceBytes, buildRestylePrompt(spec, referenceInfo), apiKey);
      } else {
        console.log('  Generando ancla Balance (sin referencia real disponible, texto puro)...');
        b64 = await generateAnchor(buildAnchorPrompt(spec), apiKey);
      }
      anchorBytes = Buffer.from(b64, 'base64');
      await writeFile(path.join(speciesDir, 'balance.png'), anchorBytes);
      console.log(`  -> ${speciesDir}/balance.png`);
    } else {
      // Reusing an already-curated Balance anchor as the base for edits.
      const existing = path.join(speciesDir, 'balance.png');
      if (!existsSync(existing)) {
        console.error(`  Falta ${existing} para generar otras fases sin regenerar Balance. Sáltate --phases o genera Balance primero.`);
        continue;
      }
      anchorBytes = await readFile(existing);
    }

    for (const phase of ['exceso', 'eco']) {
      if (!phases.includes(phase)) continue;
      console.log(`  Generando ${phase} (image-to-image sobre ancla Balance)...`);
      const prompt = phase === 'exceso' ? buildExcesoPrompt(spec) : buildEcoPrompt(spec);
      const b64 = await generateVariant(anchorBytes, prompt, apiKey);
      await writeFile(path.join(speciesDir, `${phase}.png`), Buffer.from(b64, 'base64'));
      console.log(`  -> ${speciesDir}/${phase}.png`);
    }
  }

  console.log('\nListo. Revisa y cura manualmente antes de subir a R2 / registrar en species_phase_anchors (docs/lore_world_bible_ecorex_v4.md §15.4).');
}

// Guard against side effects on import: this file is also imported as a
// module (e.g. scripts/print-species-prompt.mjs) to reuse the prompt
// builders without triggering a real, paid OpenAI generation run.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
