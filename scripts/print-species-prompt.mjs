#!/usr/bin/env node
// Prints the exact image-gen prompt for a given species + phase from a
// ficha-spec JSON file (scripts/lote.json, scripts/species.wave1.json, ...),
// reusing the same prompt builders as generate-species-art.mjs. Balance is
// generated manually in ChatGPT (see CLAUDE.md), so this is how you get its
// prompt without running the OpenAI pipeline.
//
// Usage:
//   node scripts/print-species-prompt.mjs scripts/lote.json "Trompeta del Alba" balance
//   node scripts/print-species-prompt.mjs scripts/species.wave1.json "Trompeta del Alba" exceso
//   node scripts/print-species-prompt.mjs scripts/lote.json "Trompeta del Alba" eco

import { readFile } from 'node:fs/promises';
import {
  buildAnchorPrompt,
  buildRestylePrompt,
  buildExcesoPrompt,
  buildEcoPrompt,
  findReferenceImage,
} from './generate-species-art.mjs';

async function main() {
  const [specFile, commonName, phase] = process.argv.slice(2);
  if (!specFile || !commonName || !phase) {
    console.error('Uso: node scripts/print-species-prompt.mjs <ficha-spec.json> "<Nombre común>" <balance|exceso|eco>');
    process.exit(1);
  }
  if (!['balance', 'exceso', 'eco'].includes(phase)) {
    console.error(`Fase desconocida: ${phase}. Usa balance, exceso o eco.`);
    process.exit(1);
  }

  const specs = JSON.parse(await readFile(specFile, 'utf8'));
  const spec = specs.find((s) => s.commonName === commonName);
  if (!spec) {
    console.error(`No se encontró "${commonName}" en ${specFile}.`);
    process.exit(1);
  }

  let prompt;
  if (phase === 'balance') {
    const referenceInfo = findReferenceImage(spec);
    prompt = referenceInfo ? buildRestylePrompt(spec, referenceInfo) : buildAnchorPrompt(spec);
    if (referenceInfo) {
      console.error(`(Hay referencia real disponible en ${referenceInfo.path} — adjúntala en ChatGPT junto con este prompt de restyle.)\n`);
    }
  } else if (phase === 'exceso') {
    prompt = buildExcesoPrompt(spec);
  } else {
    prompt = buildEcoPrompt(spec);
  }

  console.log(prompt);
}

main();
