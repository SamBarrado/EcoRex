#!/usr/bin/env node
// Scans public/species-art/{slug}/ for species that aren't in scripts/seed.sql
// yet, looks up their ficha-spec (scientificName/commonName/fractae) in the
// known spec files, appends the missing INSERT rows to seed.sql (Fractae if
// new, species, phase anchors) and applies it to the local D1 DB.
//
// Usage: npm run db:sync-species
// Remote is NOT touched automatically — run `npm run db:seed:remote`
// yourself once you're happy with the result (production DB writes stay a
// manual, confirmed step).

import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ART_DIR = path.join(ROOT, 'public/species-art');
const SEED_FILE = path.join(ROOT, 'scripts/seed.sql');
const SPEC_FILES = ['scripts/lote.json', 'scripts/species.wave1.json'];
const PHASES = ['balance', 'exceso', 'eco'];

// Fixed reference (docs/lore_world_bible_ecorex_v4.md §2) — the 8 Fractae.
const FRACTAE_META = {
  Alegría: { slug: 'alegria', latin: 'Lumen', icon: 'sol', color: 'amarillo' },
  Tristeza: { slug: 'tristeza', latin: 'Tristitia', icon: 'gota', color: 'azul' },
  Furia: { slug: 'furia', latin: 'Ira', icon: 'llama', color: 'rojo' },
  Miedo: { slug: 'miedo', latin: 'Pavor', icon: 'ojo en sombra', color: 'morado' },
  Confianza: { slug: 'confianza', latin: 'Fides', icon: 'escudo', color: 'verde' },
  Asco: { slug: 'asco', latin: 'Fastidium', icon: 'mancha', color: 'verde oscuro' },
  Sorpresa: { slug: 'sorpresa', latin: 'Stupor', icon: 'estrella', color: 'naranja' },
  Curiosidad: { slug: 'curiosidad', latin: 'Spes', icon: 'lupa', color: 'lila' },
};

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function loadSpecs() {
  const specs = [];
  for (const file of SPEC_FILES) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    const entries = JSON.parse(await readFile(full, 'utf8'));
    for (const entry of entries) specs.push(entry);
  }
  return specs;
}

function findArtFolders() {
  return readdirSync(ART_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => PHASES.every((phase) => existsSync(path.join(ART_DIR, slug, `${phase}.png`))));
}

function extractIds(seedSql, tableName, idColumnIndex = 0) {
  const regex = new RegExp(`INSERT OR IGNORE INTO ${tableName} \\([^)]*\\) VALUES([\\s\\S]*?);`, 'm');
  const match = seedSql.match(regex);
  const ids = [];
  const scientificNames = [];
  if (match) {
    const rowsBlock = match[1];
    const rowRegex = /\(([^()]*)\)/g;
    let m;
    while ((m = rowRegex.exec(rowsBlock))) {
      const cols = m[1].split(',').map((c) => c.trim());
      ids.push(parseInt(cols[idColumnIndex], 10));
      if (tableName === 'species') scientificNames.push(cols[1].replace(/^'|'$/g, ''));
      if (tableName === 'fractae') scientificNames.push(cols[1].replace(/^'|'$/g, ''));
    }
  }
  return { maxId: ids.length ? Math.max(...ids) : 0, existing: scientificNames };
}

async function main() {
  const seedSql = await readFile(SEED_FILE, 'utf8');
  const specs = await loadSpecs();
  const folders = findArtFolders();

  const { maxId: maxFractaeId, existing: existingFractaeSlugs } = extractIds(seedSql, 'fractae');
  const { maxId: maxSpeciesId, existing: existingScientificNames } = extractIds(seedSql, 'species');
  const { maxId: maxAnchorId } = extractIds(seedSql, 'species_phase_anchors');

  const existingSlugs = new Set(existingScientificNames.map((n) => slugify(n)));
  const knownFractaeSlugs = new Set(existingFractaeSlugs.map((s) => s.toLowerCase()));

  const newFolders = folders.filter((slug) => !existingSlugs.has(slug));
  if (newFolders.length === 0) {
    console.log('Nada nuevo: todas las carpetas de public/species-art/ ya están en seed.sql.');
    return;
  }

  let nextFractaeId = maxFractaeId + 1;
  let nextSpeciesId = maxSpeciesId + 1;
  let nextAnchorId = maxAnchorId + 1;

  const newFractaeRows = [];
  const newSpeciesRows = [];
  const newAnchorRows = [];
  const fractaeIdBySlug = {}; // slug -> id, for newly added Fractae this run

  for (const slug of newFolders) {
    const spec = specs.find((s) => slugify(s.scientificName) === slug);
    if (!spec) {
      console.error(`⚠️  ${slug}: no encontré su ficha-spec en scripts/lote.json ni species.wave1.json. Sáltate esta especie o añade su spec primero.`);
      continue;
    }

    const fractaeName = spec.fractae?.name;
    const fractaeMeta = FRACTAE_META[fractaeName];
    if (!fractaeMeta) {
      console.error(`⚠️  ${slug}: Fractae "${fractaeName}" desconocida, no está en el catálogo fijo de 8. Revisa el spec.`);
      continue;
    }

    let fractaeId;
    if (knownFractaeSlugs.has(fractaeMeta.slug)) {
      // Already in seed.sql from before this run — resolve its id from the file.
      const rowMatch = seedSql.match(new RegExp(`\\((\\d+), '${fractaeMeta.slug}'`));
      fractaeId = rowMatch ? parseInt(rowMatch[1], 10) : undefined;
    } else if (fractaeIdBySlug[fractaeMeta.slug]) {
      fractaeId = fractaeIdBySlug[fractaeMeta.slug];
    } else {
      fractaeId = nextFractaeId++;
      fractaeIdBySlug[fractaeMeta.slug] = fractaeId;
      newFractaeRows.push(
        `  (${fractaeId}, ${sqlEscape(fractaeMeta.slug)}, ${sqlEscape(fractaeMeta.latin)}, ${sqlEscape(fractaeName)}, ${sqlEscape(fractaeMeta.icon)}, ${sqlEscape(fractaeMeta.color)}, NULL)`
      );
      knownFractaeSlugs.add(fractaeMeta.slug);
    }

    const speciesId = nextSpeciesId++;
    newSpeciesRows.push(
      `  (${speciesId}, ${sqlEscape(spec.scientificName)}, ${sqlEscape(spec.commonName)}, ${fractaeId}, NULL, NULL, NULL, NULL, 1, 1)`
    );

    for (const phase of PHASES) {
      newAnchorRows.push(
        `  (${nextAnchorId++}, ${speciesId}, ${sqlEscape(phase)}, ${sqlEscape(`/species-art/${slug}/${phase}.png`)}, NULL)`
      );
    }

    console.log(`+ ${spec.commonName} (${spec.scientificName}) — Fractae: ${fractaeName}`);
  }

  if (!newSpeciesRows.length) {
    console.log('No hay especies nuevas insertables (revisa los avisos de arriba).');
    return;
  }

  let updated = seedSql;
  if (newFractaeRows.length) {
    updated = updated.replace(
      /(INSERT OR IGNORE INTO fractae \([^)]*\) VALUES[\s\S]*?)\n {2}\((\d+), '[^']*', '[^']*', '[^']*', '[^']*', '[^']*', NULL\);/,
      (full) => full.replace(/;$/, ',\n' + newFractaeRows.join(',\n') + ';')
    );
  }
  updated = updated.replace(
    /(INSERT OR IGNORE INTO species \([^)]*\) VALUES[\s\S]*?);/,
    (full) => full.replace(/;$/, ',\n' + newSpeciesRows.join(',\n') + ';')
  );
  updated = updated.replace(
    /(INSERT OR IGNORE INTO species_phase_anchors \([^)]*\) VALUES[\s\S]*?);/,
    (full) => full.replace(/;$/, ',\n' + newAnchorRows.join(',\n') + ';')
  );

  await writeFile(SEED_FILE, updated);
  console.log(`\nActualizado ${path.relative(ROOT, SEED_FILE)} con ${newSpeciesRows.length} especie(s) nueva(s).`);

  console.log('\nAplicando a la DB local...');
  execSync('npx wrangler d1 execute DB --local --file=scripts/seed.sql', { cwd: ROOT, stdio: 'inherit' });

  console.log('\nListo en local. Cuando quieras subirlo a producción: npm run db:seed:remote');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
