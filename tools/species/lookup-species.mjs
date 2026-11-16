#!/usr/bin/env node
// Cross-checks a dinosaur genus against three independent real-data sources
// before writing/generating its ficha-spec, per docs/lore_world_bible_ecorex_v4.md §15.4.1:
//   1. NHM Dino Directory (structured: diet, length, period, taxonomy, body shape)
//   2. dinosaurpictures.org (plain-text corroboration: habitat phrasing, quick facts)
//   3. Paleobiology Database (structured: taxonomy, time range, fossil countries,
//      validity status — covers thousands of genera, well beyond NHM's ~300)
// None of these sources' IMAGES are used as visual reference (NHM has none exposed
// here; dinosaurpictures.org's are AI-generated per their own disclaimer) —
// this is for factual grounding only.
//
// Usage: node tools/species/lookup-species.mjs Telmatosaurus

import { fetchDinoDirectory, formatForPrompt as formatNhm } from './lib/dino-directory.mjs';
import { fetchDinosaurPicturesOrg, formatForPrompt as formatDpo } from './lib/dinosaur-pictures-org.mjs';
import { fetchPbdbTaxon, formatForPrompt as formatPbdb } from './lib/pbdb.mjs';

async function main() {
  const genus = process.argv[2];
  if (!genus) {
    console.error('Uso: node tools/species/lookup-species.mjs <Genero>');
    process.exit(1);
  }

  const [nhm, dpo, pbdb] = await Promise.all([
    fetchDinoDirectory(genus).catch(() => null),
    fetchDinosaurPicturesOrg(genus).catch(() => null),
    fetchPbdbTaxon(genus).catch(() => null),
  ]);

  console.log(`\n=== ${genus} ===\n`);

  if (nhm) {
    console.log(formatNhm(nhm));
  } else {
    console.log('NHM Dino Directory: no encontrado (género fuera de su catálogo de ~300).');
  }

  console.log();

  if (dpo) {
    console.log(formatDpo(dpo));
  } else {
    console.log('dinosaurpictures.org: no encontrado.');
  }

  console.log();

  if (pbdb) {
    console.log(formatPbdb(pbdb));
  } else {
    console.log('Paleobiology Database: no encontrado.');
  }

  console.log();
  if (!nhm && !dpo && !pbdb) {
    console.log('Ninguna fuente tiene datos de este género — habrá que confiar en el conocimiento general del LLM para la ficha-spec.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
