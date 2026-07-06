#!/usr/bin/env node
// Standalone test/lookup CLI for scripts/lib/dino-directory.mjs.
// Usage: node scripts/fetch-dino-directory.mjs Telmatosaurus

import { fetchDinoDirectory, formatForPrompt } from './lib/dino-directory.mjs';

async function main() {
  const genus = process.argv[2];
  if (!genus) {
    console.error('Uso: node scripts/fetch-dino-directory.mjs <Genero>');
    process.exit(1);
  }

  const data = await fetchDinoDirectory(genus);
  if (!data) {
    console.log(`No encontrado en el Dino Directory: ${genus} (puede que el género no esté en su catálogo de ~300).`);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
  console.log('\n--- Formateado para prompt ---\n');
  console.log(formatForPrompt(data));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
