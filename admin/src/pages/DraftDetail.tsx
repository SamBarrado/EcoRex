import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { GROUPS } from "../../../shared/species-sources/groups.mjs";
import { HABITAT_SLUGS, type SpecIssue, type SpecSheet } from "../../functions/lib/specContract";

interface Detail {
  draft: { id: number; genus: string; fractae: string; edition: string; taxon_group: string; status: string; species_id: number | null; spec: SpecSheet | null; sources: { sources: { source: string; ref: string; observed?: string; note?: string; consultedAt: string }[]; consultedAt: string } | null };
  issues: SpecIssue[];
  species: { is_active: number; anchors: number } | null;
  versions: { version: number; origin: string; note: string | null; created_at: string }[];
}

const TEXT_FIELDS: [keyof SpecSheet, string, boolean][] = [
  ["scientificName", "Nombre científico", false], ["commonName", "Nombre común", false], ["traits", "Rasgos físicos", true],
  ["habitat", "Hábitat / ecología", true], ["palette", "Paleta", true], ["silhouette", "Silueta", true],
  ["closestFamousRelative", "Pariente famoso más cercano", false], ["distinguishingFromRelative", "Diferencias con el pariente", true], ["lorePhrase", "Frase de lore", true],
];
const NEXT: Record<string, [string, string][]> = {
  candidate: [["rejected", "Descartar"]], researching: [["rejected", "Descartar"]],
  spec_draft: [["approved", "Aprobar ficha"], ["needs_revision", "Pedir cambios"], ["rejected", "Descartar"]],
  needs_revision: [["approved", "Aprobar ficha"], ["spec_draft", "Volver a revisión"], ["rejected", "Descartar"]],
  approved: [["needs_revision", "Reabrir"]], rejected: [["candidate", "Recuperar"]],
};

export default function DraftDetail() {
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [spec, setSpec] = useState<SpecSheet | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [wave, setWave] = useState("1");

  const load = useCallback(async () => {
    const r = await api<Detail>(`/drafts/${id}`);
    setD(r); setSpec(r.draft.spec);
  }, [id]);
  useEffect(() => { load().catch((e: Error) => setErr([e.message])); }, [load]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true); setErr([]); setMsg("");
    try { await fn(); setMsg(label); await load(); }
    catch (e) {
      const extra = e instanceof ApiError ? e.message : (e as Error).message;
      setErr([extra]);
    } finally { setBusy(false); }
  }
  const post = (path: string, body: unknown = {}) => api(`/drafts/${id}${path}`, { method: "POST", body: JSON.stringify(body) });

  if (!d) return <p className="muted">{err[0] ?? "Cargando…"}</p>;
  const { draft } = d;
  const editable = draft.status === "spec_draft" || draft.status === "needs_revision";
  const set = (k: keyof SpecSheet, v: string) => setSpec((s) => (s ? { ...s, [k]: v } : s));

  return (
    <>
      <p><Link to="/discovery">← Discovery</Link></p>
      <h2>{draft.genus} <span className="tag">{draft.status}</span></h2>
      <p className="muted">Fractae: {draft.fractae}{draft.edition ? ` · Edición: ${draft.edition}` : ""}</p>
      {GROUPS[draft.taxon_group]?.dinosaur === false && <p className="muted">Grupo: {GROUPS[draft.taxon_group]?.label} (no dinosaurio; admitido por el canon, World Bible v7).</p>}
      {msg && <p className="ok">{msg}</p>}
      {err.map((e, i) => <p key={i} role="alert" className="error">{e}</p>)}

      <section className="panel">
        <h3>1. Fuentes paleontológicas</h3>
        {draft.sources ? (
          <>
            <p className="muted">Consultadas el {draft.sources.consultedAt}. Solo aparecen las fuentes que respondieron; no se inventa nada.</p>
            {draft.sources.sources.length === 0 && <p className="error">Ninguna fuente respondió: la ficha se basaría en el conocimiento general del modelo.</p>}
            {draft.sources.sources.map((s) => (
              <details key={s.source}><summary><b>{s.source}</b> — <a href={s.ref} target="_blank" rel="noreferrer noopener">registro</a>{s.note ? ` · ${s.note}` : ""}</summary><pre>{s.observed}</pre></details>
            ))}
          </>
        ) : <p className="muted">Aún sin investigar.</p>}
        {(draft.status === "candidate" || draft.status === "researching") && (
          <button disabled={busy} onClick={() => run("Fuentes consultadas", () => post("/research"))}>{draft.sources ? "Volver a consultar" : "Consultar fuentes (gratis)"}</button>
        )}
      </section>

      <section className="panel">
        <h3>2. Ficha-spec</h3>
        {!spec && <p className="muted">Sin ficha todavía.</p>}
        {["candidate", "researching", "needs_revision"].includes(draft.status) && (
          <button disabled={busy} onClick={() => {
            if (window.confirm("Esto llama a la API de Anthropic y tiene coste (pequeño). ¿Generar la ficha?")) void run("Ficha generada", () => post("/generate", { confirm: true }));
          }}>💸 Generar ficha con IA</button>
        )}
        {spec && (
          <>
            {d.issues.length > 0 && <ul className="issues">{d.issues.map((i, k) => <li key={k} className={i.level}>{i.path}: {i.message}</li>)}</ul>}
            <p className="muted">Fractae: {spec.fractae.name} ({spec.fractae.latin}) · opuesto: {spec.oppositeFractae ?? "—"} — fijados por el canon, no editables.</p>
            {TEXT_FIELDS.map(([k, label, multi]) => (
              <label key={k}>{label}
                {multi
                  ? <textarea rows={3} disabled={!editable} value={(spec[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
                  : <input disabled={!editable} value={(spec[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />}
              </label>
            ))}
            <label>Hábitat canónico (decisión humana, obligatorio para aprobar)
              <select disabled={!editable} value={spec.habitatSlug ?? ""} onChange={(e) => set("habitatSlug", e.target.value)}>
                <option value="" disabled>Elige…</option>
                {HABITAT_SLUGS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            {editable && <button disabled={busy} onClick={() => run("Nueva versión guardada", () => api(`/drafts/${id}`, { method: "PATCH", body: JSON.stringify({ spec, note: "Edición manual" }) }))}>Guardar como nueva versión</button>}
            {!editable && <p className="muted">Una ficha en este estado es inmutable. Para cambiarla, reábrela.</p>}
          </>
        )}
      </section>

      <section className="panel">
        <h3>3. Revisión</h3>
        <div className="row">
          {(NEXT[draft.status] ?? []).map(([to, label]) => (
            <button key={to} disabled={busy} onClick={() => run(`Estado: ${to}`, () => post("/status", { to }))}>{label}</button>
          ))}
        </div>
        <p className="muted">Aprobar no publica nada en el juego: solo deja la ficha lista para el Bestiario.</p>
        {draft.status === "approved" && (
          <div className="row">
            <label>Oleada de lanzamiento<input type="number" min={1} max={99} value={wave} onChange={(e) => setWave(e.target.value)} /></label>
            <button disabled={busy} onClick={() => {
              if (window.confirm(`Esto ocupa un hueco «???» libre de la oleada ${wave} en la base de datos de producción y la deja INACTIVA (los jugadores no la ven). ¿Promover?`)) void run("Especie creada (inactiva)", () => post("/promote", { launchWave: Number(wave) }));
            }}>Promover al Bestiario (inactiva)</button>
          </div>
        )}
        {draft.status === "promoted" && (
          <div className="row">
            <span>Promovida como especie #{draft.species_id} — <b>{d.species?.is_active ? "ACTIVA en el juego" : "inactiva"}</b>. <Link to="/bestiario">Ver Bestiario</Link></span>
            {!d.species?.is_active && <>
              <button disabled={busy} onClick={() => {
                if (window.confirm("Se comprueba que el arte (balance, exceso y eco .webp) ya está publicado en la PWA y la especie pasa a ser JUGABLE: entra en Percibir y en la fusión. ¿Activar?")) void run("Especie activada", () => api(`/drafts/${id}/activate`, { method: "POST" }));
              }}>Activar en el juego</button>
              <button disabled={busy} onClick={() => {
                if (window.confirm("El hueco vuelve a «???» y la ficha vuelve a «approved». Solo es posible mientras esté inactiva, sin arte y sin cartas. ¿Despromover?")) void run("Promoción deshecha", () => api(`/drafts/${id}/promote`, { method: "DELETE" }));
              }}>Despromover</button>
            </>}
            {d.species?.is_active === 1 && (
              <button disabled={busy} onClick={() => {
                if (window.confirm("La especie sale de los sorteos y se borran sus anclas. Solo es posible si ningún jugador tiene cartas suyas. ¿Desactivar?")) void run("Especie desactivada", () => api(`/drafts/${id}/activate`, { method: "DELETE" }));
              }}>Desactivar</button>
            )}
          </div>
        )}
        <h4>Historial</h4>
        <ul className="list">{d.versions.map((v) => <li key={v.version}>v{v.version} · {v.origin === "ai" ? "IA" : "humano"} · {v.created_at}{v.note ? ` · ${v.note}` : ""}</li>)}</ul>
      </section>
    </>
  );
}
