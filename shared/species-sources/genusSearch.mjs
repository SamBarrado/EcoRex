// Flexible genus-name matching (pure, no I/O). Used by the CLI discovery tool and
// by Ecorex Admin. Handles: partial text anywhere in the name, case/accents,
// Spanish spellings ("tiranosaurio", "estegosaurio", "diplodoco") and small typos.
//
// The trick is a *phonetic key*: both the query and every genus are reduced to a
// spelling-neutral form (y->i, ph->f, k->c, th->t, ae/oe->e, doubled letters
// collapsed; "qu" -> c as in Spanish "anqui-"), so "Tyrannosaurus" and "tiranosaurio" compare as near-identical.

export function normalize(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

export function phonetic(s) {
  return normalize(s)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ae|oe/g, 'e')
    .replace(/qu/g, 'c')
    .replace(/k/g, 'c')
    .replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

/** Levenshtein distance, giving up (returns max+1) once it must exceed `max`. */
export function levenshtein(a, b, max = Infinity) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** The query as typed plus Spanish -> Latin endings ("-saurio", "-o" => "-us"). */
export function queryVariants(query) {
  const first = String(query).trim().split(/\s+/)[0] ?? ''; // "Tyrannosaurus rex" -> "Tyrannosaurus"
  const base = phonetic(first);
  const variants = new Set([base]);
  if (/io$/.test(base)) variants.add(base.replace(/io$/, 'us'));
  if (/o$/.test(base)) variants.add(base.replace(/o$/, 'us'));
  if (/a$/.test(base)) variants.add(base.replace(/a$/, 'us'));
  return [...variants].filter((v) => v.length >= 2);
}

const tolerance = (len) => (len <= 4 ? 0 : len <= 7 ? 1 : 2);

/**
 * Ranks genera for a query. Order: exact, starts-with, contains, typo-tolerant prefix.
 * Ties: closer length first, then alphabetical.
 */
export function rankGenera(genera, query, limit = 15) {
  const variants = queryVariants(query);
  if (!variants.length) return [];
  const scored = [];
  for (const genus of new Set(genera)) { // PBDB lists some names more than once
    const key = phonetic(genus);
    let best = Infinity;
    for (const v of variants) {
      let s = Infinity;
      if (key === v) s = 0;
      else if (key.startsWith(v)) s = 1;
      else if (v.length >= 3 && key.includes(v)) s = 2;
      else if (v.length >= 4) {
        const tol = tolerance(v.length);
        for (let L = v.length - 1; L <= v.length + 1; L++) {
          if (L < 1) continue;
          const d = levenshtein(v, key.slice(0, L), tol);
          if (d <= tol) s = Math.min(s, 3 + d);
        }
      }
      if (s < best) best = s;
    }
    if (best !== Infinity) scored.push({ genus, best, len: key.length });
  }
  if (!scored.length) return [];
  // With an exact/prefix/contains match, typo-tolerant neighbours are just noise; when the best
  // match is itself a typo-match, only keep those about as close as the best one.
  const top = Math.min(...scored.map((s) => s.best));
  const cutoff = top <= 2 ? 2 : top + 1;
  scored.sort((a, b) => a.best - b.best || a.len - b.len || a.genus.localeCompare(b.genus));
  return scored.filter((s) => s.best <= cutoff).slice(0, limit).map((s) => s.genus);
}
