#!/usr/bin/env node
// Local-only web UI for discovering candidate dinosaur genera from the
// Paleobiology Database — filter by clado (base_name), intervalo temporal,
// país y volumen mínimo de registros, or search by exact scientific name.
// Genera already used in scripts/lote.json/species.wave1.json are NOT
// excluded (a genus can legitimately be reused for a different Fractae or
// a special edition) — instead each candidate is annotated with which
// Fractae it's already been used for, if any. Picking a candidate + a
// Fractae calls generate-species-spec.mjs (via direct import, not
// shell-out) and appends the result to scripts/lote.json.
//
// This is dev tooling only — never deployed, no build step, vanilla JS.
//
// Usage: npm run species:discover  (opens http://localhost:4790 automatically)

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { searchPbdbTaxa, fetchPbdbTaxon, autocompleteDinosaurGenus } from './lib/pbdb.mjs';
import { generateSpec, resolveFractae, loadDevVarsApiKey, FRACTAE } from './generate-species-spec.mjs';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4790;
const LOTE_PATH = 'scripts/lote.json';

// Curated Spanish label -> real PBDB term, so the user never has to know
// taxonomic/geological English nomenclature to use the discovery tool.
const CLADE_OPTIONS = [
  { label: 'Cualquiera (todos los dinosaurios)', value: 'Dinosauria' },
  { label: 'Carnívoros bípedos (Terópodos)', value: 'Theropoda' },
  { label: 'Cuellilargos herbívoros (Saurópodos)', value: 'Sauropoda' },
  { label: 'Acorazados (Anquilosaurios)', value: 'Ankylosauria' },
  { label: 'Con placas dorsales (Estegosaurios)', value: 'Stegosauria' },
  { label: 'Pico de pato (Hadrosáuridos)', value: 'Hadrosauridae' },
  { label: 'Con cuernos (Ceratopsios)', value: 'Ceratopsia' },
  { label: 'Cabeza de cúpula (Paquicefalosaurios)', value: 'Pachycephalosauria' },
  { label: 'Voladores (Pterosaurios)', value: 'Pterosauria' },
  { label: 'Marinos (Reptiles marinos)', value: 'Sauropterygia' },
];

const INTERVAL_OPTIONS = [
  { label: 'Triásico', value: 'Triassic' },
  { label: 'Jurásico', value: 'Jurassic' },
  { label: 'Cretácico', value: 'Cretaceous' },
  { label: 'Jurásico temprano', value: 'Early Jurassic' },
  { label: 'Jurásico tardío', value: 'Late Jurassic' },
  { label: 'Cretácico temprano', value: 'Early Cretaceous' },
  { label: 'Cretácico tardío', value: 'Late Cretaceous' },
];

const COUNTRY_OPTIONS = [
  { label: 'Estados Unidos', value: 'US' },
  { label: 'Canadá', value: 'CA' },
  { label: 'Argentina', value: 'AR' },
  { label: 'Brasil', value: 'BR' },
  { label: 'China', value: 'CN' },
  { label: 'Mongolia', value: 'MN' },
  { label: 'Reino Unido', value: 'GB' },
  { label: 'Alemania', value: 'DE' },
  { label: 'España', value: 'ES' },
  { label: 'Marruecos', value: 'MA' },
  { label: 'Níger', value: 'NE' },
  { label: 'Australia', value: 'AU' },
];

// Maps genus -> list of { fractae, commonName, edition } already generated for it,
// across every wave/edition (a genus can legitimately appear more than once,
// e.g. the same species reused for a different Fractae or a special
// edition) — used to annotate candidates, not to exclude them.
// Reads only lote.json: species.wave1.json's 5 entries are already
// duplicated inside it (as its "Wave 1" edition), so also reading
// species.wave1.json would double-count every existing use.
function loadExistingGenera() {
  const byGenus = new Map();
  if (existsSync(LOTE_PATH)) {
    const list = JSON.parse(readFileSync(LOTE_PATH, 'utf8'));
    for (const entry of list) {
      const genus = entry.scientificName?.split(' ')[0];
      if (!genus) continue;
      if (!byGenus.has(genus)) byGenus.set(genus, []);
      byGenus.get(genus).push({
        fractae: entry.fractae?.name ?? null,
        commonName: entry.commonName ?? null,
        edition: entry.edition || null,
      });
    }
  }
  return byGenus;
}

function annotateExisting(candidates, existing) {
  return candidates.map((c) => ({ ...c, existingUses: existing.get(c.genus) ?? [] }));
}

async function handleSearch(url) {
  const baseName = url.searchParams.get('baseName') || undefined;
  const interval = url.searchParams.get('interval') || undefined;
  const country = url.searchParams.get('country') || undefined;
  const minOccurrences = Number(url.searchParams.get('minOccurrences') || '1');

  if (!baseName) {
    return { status: 400, body: { error: 'Falta el clado (baseName)' } };
  }

  const existing = loadExistingGenera();
  const candidates = await searchPbdbTaxa({ baseName, interval, country, minOccurrences });

  return { status: 200, body: { candidates: annotateExisting(candidates, existing), fractae: Object.values(FRACTAE) } };
}

async function handleAutocomplete(prefix) {
  if (!prefix || prefix.length < 2) return { status: 200, body: { suggestions: [] } };
  const suggestions = await autocompleteDinosaurGenus(prefix);
  return { status: 200, body: { suggestions } };
}

async function handleSearchByName(genus) {
  const existing = loadExistingGenera();
  const taxon = await fetchPbdbTaxon(genus);
  if (!taxon) {
    return { status: 200, body: { candidates: [], fractae: Object.values(FRACTAE) } };
  }
  const candidate = {
    genus: taxon.taxonName,
    family: taxon.classification.family,
    nOccurrences: taxon.nOccurrences ?? 0,
    earlyMa: taxon.earlyMa,
    lateMa: taxon.lateMa,
    countries: taxon.countries,
  };

  return { status: 200, body: { candidates: annotateExisting([candidate], existing), fractae: Object.values(FRACTAE) } };
}

// Wikipedia has no coverage guarantee, but for named dinosaur genera it
// usually has a page with a real paleoart/reconstruction thumbnail — good
// enough for "does this look right before I spend an API call" purposes.
// Not a data source for the ficha-spec itself, purely a visual sanity check.
async function handleImage(genus) {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(genus)}`);
  if (!res.ok) return { status: 200, body: { thumbnail: null } };
  const json = await res.json();
  return {
    status: 200,
    body: {
      thumbnail: json.thumbnail?.source ?? null,
      originalImage: json.originalimage?.source ?? null,
      pageUrl: json.content_urls?.desktop?.page ?? null,
    },
  };
}

async function handleGenerateSpec(body) {
  const { genus, fractae, edition } = body;
  if (!genus || !fractae) {
    return { status: 400, body: { error: 'Faltan genus o fractae' } };
  }

  const apiKey = loadDevVarsApiKey();
  if (!apiKey) {
    return { status: 500, body: { error: 'Falta ANTHROPIC_API_KEY (env var o .dev.vars).' } };
  }

  try {
    resolveFractae(fractae);
  } catch (err) {
    return { status: 400, body: { error: err.message } };
  }

  const progress = [];
  const spec = await generateSpec(genus, fractae, { apiKey, edition: edition || '', onProgress: (msg) => progress.push(msg) });

  let list = [];
  if (existsSync(LOTE_PATH)) {
    list = JSON.parse(await readFile(LOTE_PATH, 'utf8'));
  }
  list.push(spec);
  await import('node:fs/promises').then((fs) => fs.writeFile(LOTE_PATH, JSON.stringify(list, null, 2) + '\n'));

  return { status: 200, body: { spec, progress, savedTo: LOTE_PATH, total: list.length } };
}

function renderOptions(options, { includeAny = false } = {}) {
  const anyOption = includeAny ? '<option value="">Cualquiera</option>' : '';
  return anyOption + options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
}

const PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Ecorex — Discovery PBDB</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #222; }
  h1 { font-size: 1.3rem; }
  form { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; margin-bottom: 1.5rem; }
  label { display: flex; flex-direction: column; font-size: 0.8rem; gap: 0.25rem; }
  input, select { padding: 0.4rem; font-size: 0.9rem; }
  button { padding: 0.5rem 1rem; cursor: pointer; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #ddd; }
  select { padding: 0.3rem; }
  td.thumb { width: 60px; }
  td.thumb img { width: 56px; height: 42px; object-fit: cover; border-radius: 4px; display: block; }
  .existing-badge { background: #fff3cd; color: #665200; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.8rem; cursor: help; }
  #status { font-size: 0.85rem; color: #555; margin: 0.5rem 0; white-space: pre-wrap; }
  #result { margin-top: 1rem; padding: 1rem; background: #f6f6f6; border-radius: 6px; display: none; white-space: pre-wrap; font-size: 0.85rem; }
  #lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; flex-direction: column; cursor: zoom-out; z-index: 10; }
  #lightbox img { max-width: 90vw; max-height: 85vh; border-radius: 8px; }
  #lightbox figcaption { color: #fff; margin-top: 0.75rem; font-size: 1rem; font-style: italic; }
</style>
</head>
<body>
<h1>Ecorex — Discovery de especies vía PBDB</h1>
<p>Filtra géneros reales del Paleobiology Database. La columna "En proyecto" indica si un género ya está en <code>lote.json</code> y con qué Fractae/edición.</p>

<form id="nameSearchForm">
  <label>Buscar por nombre científico
    <input name="genus" id="nameSearchInput" list="genusSuggestions" placeholder="Triceratops..." autocomplete="off">
    <datalist id="genusSuggestions"></datalist>
  </label>
  <button type="submit">Buscar</button>
</form>

<p style="font-size:0.85rem; color:#777; margin: -0.75rem 0 1rem;">— o filtra por criterios —</p>

<form id="searchForm">
  <label>Grupo de dinosaurio<select name="baseName" required>${renderOptions(CLADE_OPTIONS)}</select></label>
  <label>Época<select name="interval">${renderOptions(INTERVAL_OPTIONS, { includeAny: true })}</select></label>
  <label>País donde se encontró<select name="country">${renderOptions(COUNTRY_OPTIONS, { includeAny: true })}</select></label>
  <label>Mín. fósiles registrados<input name="minOccurrences" type="number" value="3" min="1"></label>
  <button type="submit">Buscar</button>
  <button type="button" id="clearFiltersBtn">Limpiar filtros</button>
</form>
<div id="status"></div>
<label id="sortLabel" style="display:none; margin-bottom: 0.5rem;">Ordenar por
  <select id="sortSelect">
    <option value="reliability-desc">Fiabilidad (más fósiles registrados primero)</option>
    <option value="reliability-asc">Fiabilidad (menos fósiles registrados primero)</option>
    <option value="name-asc">Nombre alfabético (A-Z)</option>
    <option value="name-desc">Nombre alfabético (Z-A)</option>
    <option value="age-desc">Antigüedad (más antiguo primero)</option>
    <option value="age-asc">Antigüedad (más reciente primero)</option>
  </select>
</label>
<table id="resultsTable" style="display:none">
  <thead><tr><th>Foto</th><th>Género</th><th>Familia</th><th>Rango temporal (Ma)</th><th>Ocurrencias</th><th>Países</th><th>En proyecto</th><th>Fractae</th><th>Wave/edición</th><th></th></tr></thead>
  <tbody></tbody>
</table>
<div id="result"></div>
<figure id="lightbox"><img alt=""><figcaption></figcaption></figure>

<script>
const statusEl = document.getElementById('status');
const table = document.getElementById('resultsTable');
const tbody = table.querySelector('tbody');
const resultEl = document.getElementById('result');
const sortLabel = document.getElementById('sortLabel');
const sortSelect = document.getElementById('sortSelect');
let fractaeOptions = [];
let currentCandidates = [];
const thumbnailCache = new Map();

const SORTERS = {
  'reliability-desc': (a, b) => b.nOccurrences - a.nOccurrences,
  'reliability-asc': (a, b) => a.nOccurrences - b.nOccurrences,
  'name-asc': (a, b) => a.genus.localeCompare(b.genus),
  'name-desc': (a, b) => b.genus.localeCompare(a.genus),
  'age-desc': (a, b) => (b.earlyMa ?? -Infinity) - (a.earlyMa ?? -Infinity),
  'age-asc': (a, b) => (a.earlyMa ?? Infinity) - (b.earlyMa ?? Infinity),
};

async function runSearch(url) {
  statusEl.textContent = 'Buscando en PBDB...';
  table.style.display = 'none';
  sortLabel.style.display = 'none';
  tbody.innerHTML = '';
  resultEl.style.display = 'none';
  thumbnailCache.clear();

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    statusEl.textContent = 'Error: ' + data.error;
    return;
  }
  fractaeOptions = data.fractae;
  currentCandidates = data.candidates;
  statusEl.textContent = currentCandidates.length + ' candidato(s) encontrados.';
  if (!currentCandidates.length) return;

  sortLabel.style.display = '';
  renderTable();
}

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const params = new URLSearchParams(new FormData(e.target));
  runSearch('/api/search?' + params.toString());
});

document.getElementById('nameSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const genus = document.getElementById('nameSearchInput').value.trim();
  if (!genus) return;
  runSearch('/api/search-by-name?genus=' + encodeURIComponent(genus));
});

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  document.getElementById('searchForm').reset();
  document.getElementById('nameSearchForm').reset();
  currentCandidates = [];
  table.style.display = 'none';
  sortLabel.style.display = 'none';
  tbody.innerHTML = '';
  resultEl.style.display = 'none';
  statusEl.textContent = '';
});

const nameInput = document.getElementById('nameSearchInput');
const suggestionsList = document.getElementById('genusSuggestions');
let autocompleteTimer = null;
nameInput.addEventListener('input', () => {
  clearTimeout(autocompleteTimer);
  const q = nameInput.value.trim();
  if (q.length < 2) return;
  autocompleteTimer = setTimeout(async () => {
    const res = await fetch('/api/autocomplete?q=' + encodeURIComponent(q));
    const data = await res.json();
    suggestionsList.innerHTML = data.suggestions.map((s) => '<option value="' + s + '">').join('');
  }, 200);
});

sortSelect.addEventListener('change', renderTable);

function renderTable() {
  table.style.display = '';
  tbody.innerHTML = '';
  const sorted = [...currentCandidates].sort(SORTERS[sortSelect.value]);
  for (const c of sorted) {
    const tr = document.createElement('tr');
    const range = (c.earlyMa ?? '?') + '–' + (c.lateMa ?? '?');
    const fractaeSelect = fractaeOptions.map((f) => '<option value="' + f.name + '">' + f.name + '</option>').join('');
    const existingLabels = c.existingUses.map((u) => u.fractae + (u.edition ? ' (' + u.edition + ')' : ''));
    const existingCell = c.existingUses.length
      ? '<span class="existing-badge" title="' + c.existingUses.map((u) => u.commonName).join(', ') + '">' +
        existingLabels.join(', ') + '</span>'
      : '—';
    tr.innerHTML =
      '<td class="thumb">…</td>' +
      '<td>' + c.genus + '</td>' +
      '<td>' + (c.family ?? '—') + '</td>' +
      '<td>' + range + '</td>' +
      '<td>' + c.nOccurrences + '</td>' +
      '<td>' + (c.countries.join(', ') || '—') + '</td>' +
      '<td>' + existingCell + '</td>' +
      '<td><select>' + fractaeSelect + '</select></td>' +
      '<td><input class="edition-input" type="text" placeholder="Wave/edición (opcional)" size="14"></td>' +
      '<td><button type="button">Generar ficha</button></td>';
    tr.querySelector('button').addEventListener('click', () =>
      generateFor(c.genus, tr.querySelector('select').value, tr.querySelector('.edition-input').value, tr.querySelector('button'))
    );
    tbody.appendChild(tr);
    loadThumbnail(c.genus, tr.querySelector('.thumb'));
  }
}

async function loadThumbnail(genus, cell) {
  try {
    if (!thumbnailCache.has(genus)) {
      const res = await fetch('/api/image?genus=' + encodeURIComponent(genus));
      thumbnailCache.set(genus, await res.json());
    }
    const data = thumbnailCache.get(genus);
    if (!data.thumbnail) {
      cell.textContent = '—';
      return;
    }
    cell.innerHTML = '';
    const img = document.createElement('img');
    img.src = data.originalImage || data.thumbnail;
    img.alt = genus;
    img.title = 'Recreación de ' + genus + ' — click para ver en grande';
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(img.src, genus));
    cell.appendChild(img);
  } catch {
    cell.textContent = '—';
  }
}

const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('img');
const lightboxCaption = lightbox.querySelector('figcaption');
lightbox.addEventListener('click', () => lightbox.style.display = 'none');

function openLightbox(src, genus) {
  lightboxImg.src = src;
  lightboxCaption.textContent = genus;
  lightbox.style.display = 'flex';
}

async function generateFor(genus, fractae, edition, button) {
  button.disabled = true;
  button.textContent = 'Generando...';
  resultEl.style.display = 'block';
  resultEl.textContent = 'Generando ficha-spec para ' + genus + ' / ' + fractae + (edition ? ' (' + edition + ')' : '') + '...';

  try {
    const res = await fetch('/api/generate-spec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ genus, fractae, edition }),
    });
    const data = await res.json();
    if (!res.ok) {
      resultEl.textContent = 'Error: ' + data.error;
      return;
    }
    resultEl.textContent =
      data.progress.join('\\n') + '\\n\\n' +
      'Ficha generada y guardada en ' + data.savedTo + ' (' + data.total + ' especie/s en el archivo):\\n\\n' +
      JSON.stringify(data.spec, null, 2);
    button.textContent = 'Generada ✓';
  } catch (err) {
    resultEl.textContent = 'Error: ' + err.message;
    button.disabled = false;
    button.textContent = 'Generar ficha';
  }
}
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE);
      return;
    }

    if (url.pathname === '/api/search' && req.method === 'GET') {
      const { status, body } = await handleSearch(url);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    if (url.pathname === '/api/autocomplete' && req.method === 'GET') {
      const { status, body } = await handleAutocomplete(url.searchParams.get('q'));
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    if (url.pathname === '/api/search-by-name' && req.method === 'GET') {
      const genus = url.searchParams.get('genus');
      const { status, body } = genus
        ? await handleSearchByName(genus)
        : { status: 400, body: { error: 'Falta genus' } };
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    if (url.pathname === '/api/image' && req.method === 'GET') {
      const genus = url.searchParams.get('genus');
      const { status, body } = genus
        ? await handleImage(genus)
        : { status: 400, body: { error: 'Falta genus' } };
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    if (url.pathname === '/api/generate-spec' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const { status, body } = await handleGenerateSpec(parsedBody);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Discovery PBDB corriendo en ${url}`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} ${url}`);
});
