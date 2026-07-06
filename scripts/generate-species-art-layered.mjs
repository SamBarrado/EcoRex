#!/usr/bin/env node
// Experimental two-layer variant of generate-species-art.mjs: instead of one
// flat creature+environment scene, generates (a) a habitat BACKGROUND that
// can be reused across every species sharing that habitat+phase, and (b) a
// creature CUTOUT on a flat chroma-key green background (gpt-image-2 doesn't
// support a true transparent-background API param), lit to match that habitat's
// mood, meant to be composited together at render time (see docs/lore_world_bible_ecorex_v4.md §15.4.3).
//
// Usage:
//   node scripts/generate-species-art-layered.mjs species.json --only "Rex de Fuego"
//   node scripts/generate-species-art-layered.mjs species.json --phases calma,exceso,eco

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const IMAGE_SIZE = '1536x1024';
const PHASES = ['calma', 'exceso', 'eco'];

const ART_STYLE = `GRAPHIC ANIME/MANGA-INFLUENCED ILLUSTRATION with heavy black ink contour linework — NOT a photograph, NOT a photoreal 3D/CGI render, NOT soft-blended airbrush painting, NOT physically-based-rendering detail. This must look like mobile-game/gacha creature card art: a thick, clearly visible BLACK INK OUTLINE traces every silhouette and major surface segment — the linework is the dominant visual structure, not soft gradient blending. Color is filled in graphic, semi-flat cel-shaded blocks — only 2-3 tonal steps per surface (shadow, midtone, highlight), not smooth photographic gradients. Reduce specular highlights: surfaces should look matte/painted, not glossy or wet-looking.`;

const PHASE_MOOD = {
  calma: 'calm, stable mood, soft natural lighting, nothing dramatic happening',
  exceso: 'aggressive, violent mood — darker, more intense lighting, a sense of danger and tension in the air (storm, embers, disturbed environment) but not overloaded with debris',
  eco: 'the most extreme, climactic emotional moment possible in this environment — lighting and mood pushed to their dramatic limit for this habitat (brighter/more intense OR darker/dimmer, whichever fits the mood, see Fractae archetype)',
};

const FRACTAE_EXTREME = {
  Alegría: 'overwhelmed by joy so absolute it loses control of its own physical form — euphoria that makes it nearly weightless and radiant, on the verge of dissolving into its own light',
  Tristeza: 'sunk in a grief so deep it loses the ability to hold itself up — dissolving, surrendering its form to its own sorrow',
  Furia: 'consumed by its own rage to the point of self-destruction — uncontrolled energy fracturing its body from within',
  Miedo: 'devoured by panic to total dissolution — the final instant before vanishing, giving way to a void that consumes it completely',
  Confianza: 'its conviction becomes absolute and unmovable — transforming into a living monument, anchored forever to what it believes',
  Asco: 'its own revulsion corrodes it from within — decomposing in real time, consumed by what it itself repudiates',
  Sorpresa: 'astonishment freezes it in an instant that stays frozen forever — fragmented mid-motion, a moment that never finishes',
  Curiosidad: 'its obsession to understand dissolves it into countless fragments that keep searching for answers separately',
};

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

function habitatSlug(spec) {
  return spec.habitatSlug ?? slugify(spec.habitat);
}

function buildBackgroundPrompt(spec, phase) {
  return [
    ART_STYLE,
    `Paint ONLY the environment/background — an empty landscape scene with NO creature, NO animal, NO character in it at all.`,
    `Habitat/ecology: ${spec.habitat}.`,
    `Mood for this moment (${phase} phase): ${PHASE_MOOD[phase]}.`,
    `Full dramatic environment with real depth (foreground/midground/background), painted in this graphic illustration style. Leave clear, slightly emptier/lower-detail space roughly in the lower-center-to-left area of the frame where a large creature will later be composited in a dynamic three-quarter pose engaging toward the viewer — do not fill that area with busy foreground elements.`,
    `No text, no watermark, no UI elements, no border.`,
  ].join(' ');
}

function buildCutoutPrompt(spec, phase) {
  const parts = [
    ART_STYLE,
    `Paint ONLY a single isolated creature — NO ground, NO terrain, NO background scenery, NO environment elements of any kind. Fully isolated character illustration on a FLAT, SOLID, PERFECTLY UNIFORM chroma-key green (#00FF00) background, filling the entire canvas edge to edge with that flat green, so the creature can be cleanly cut out afterward. The green must be completely flat and uniform, no gradient, no vignette, no texture, no shadow cast onto it.`,
    `Species: ${spec.scientificName} ("${spec.commonName}").`,
    `Fixed physical traits: ${spec.traits}.`,
    `Base color palette: ${spec.palette}.`,
    `Distinctive silhouette: ${spec.silhouette}.`,
    `Unless the fixed physical traits explicitly describe crystalline/faceted features, the creature's body must stay natural creature material (skin/scales/hide), not a full-body stylized crystal/glass being.`,
    `Lighting must match this habitat/mood so it can be composited convincingly later: ${spec.habitat}; ${PHASE_MOOD[phase]}. Light the creature as if standing in that environment (matching color temperature and light direction) even though the environment itself is not painted here.`,
  ];

  const engagement = `The creature must be captured mid-action, actively engaging toward the viewer/camera — NOT a flat, static, full-body side-profile silhouette (like a museum reference plate or a walk-cycle sprite). Use a three-quarter angle or a more confrontational/dynamic camera angle (slightly low, looking up at the creature, or an angle that shows depth through the body). The creature's head/gaze and body language should be oriented toward the viewer/camera, as if reacting to the player's presence, rather than parallel to the picture plane. The creature's overall body should still lean/be positioned toward the right side of the frame (to match the empty space left in the separately-painted background), but the pose/angle itself must feel three-quarter and engaged, not a flat side elevation.`;

  if (phase === 'calma') {
    parts.push(`Pose: stable, calm but imposing posture, alert and aware of the viewer. ${engagement}`);
  } else if (phase === 'exceso') {
    parts.push(`Pose: this must NOT be "the calm pose with the mouth open" — a genuinely more aggressive and dynamic pose than a calm stance: crouched and lunging forward, weight shifted into an attack, claws/limbs raised or striking. ${engagement}`);
    parts.push(`Any glow accent should stay confined to the eyes, or to fixed elemental/crystalline traits already established for this species — not a blanket effect on the whole body.`);
  } else {
    const extreme = FRACTAE_EXTREME[spec.fractae.name];
    parts.push(`This is the Eco phase: the ${spec.fractae.name} (${spec.fractae.latin}) Fractae pushed to its absolute emotional extreme in this specific creature. The archetype of that extreme: ${extreme}.`);
    parts.push(`Manifest that extreme through THIS creature's own anatomy and habitat (${spec.habitat}) — do not default to a generic "translucent ghost" effect used for all species. This must NOT be "the calm pose with an effect overlaid" — the body pose/stance itself must change (collapsing, recoiling, convulsing, frozen mid-motion, reaching/straining — whatever the extreme implies for this creature). ${engagement}`);
  }

  parts.push(`No text, no watermark, no UI elements, no ground shadow baked in (a contact shadow will be added separately during compositing).`);
  return parts.join(' ');
}

async function generateImage(prompt, apiKey) {
  const body = {
    model: 'gpt-image-2',
    prompt,
    n: 1,
    size: IMAGE_SIZE,
    quality: 'low',
  };

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error (generations): ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  if (!data.data?.[0]?.b64_json) throw new Error('No image data in OpenAI response');
  return data.data[0].b64_json;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') args.only = argv[++i];
    else if (a === '--phases') args.phases = argv[++i].split(',');
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const specFile = args._[0];
  if (!specFile) {
    console.error('Uso: node scripts/generate-species-art-layered.mjs <species.json> [--only "Nombre niño"] [--phases calma,exceso,eco]');
    process.exit(1);
  }

  const apiKey = loadDevVarsApiKey();
  if (!apiKey) {
    console.error('Falta OPENAI_API_KEY (env var o .dev.vars).');
    process.exit(1);
  }

  const specs = JSON.parse(await readFile(specFile, 'utf8'));
  const phases = args.phases ?? PHASES;

  for (const spec of specs) {
    if (args.only && spec.commonName !== args.only) continue;
    console.log(`\n=== ${spec.commonName} (${spec.scientificName}) ===`);

    const bgDir = path.join('especies_design/backgrounds', habitatSlug(spec));
    const cutoutDir = path.join('especies_design/cutouts', slugify(spec.commonName));
    await mkdir(bgDir, { recursive: true });
    await mkdir(cutoutDir, { recursive: true });

    for (const phase of phases) {
      const bgPath = path.join(bgDir, `${phase}.png`);
      if (existsSync(bgPath)) {
        console.log(`  [fondo] ${bgPath} ya existe, se reutiliza (compartido por hábitat).`);
      } else {
        console.log(`  Generando fondo de hábitat (${phase})...`);
        const b64 = await generateImage(buildBackgroundPrompt(spec, phase), apiKey);
        await writeFile(bgPath, Buffer.from(b64, 'base64'));
        console.log(`  -> ${bgPath}`);
      }

      console.log(`  Generando recorte de criatura (${phase})...`);
      const cutoutB64 = await generateImage(buildCutoutPrompt(spec, phase), apiKey);
      const cutoutPath = path.join(cutoutDir, `${phase}.png`);
      await writeFile(cutoutPath, Buffer.from(cutoutB64, 'base64'));
      console.log(`  -> ${cutoutPath}`);
    }
  }

  console.log('\nListo. Revisa fondo + recorte por separado antes de decidir si este flujo sustituye al de escena plana (scripts/generate-species-art.mjs).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
