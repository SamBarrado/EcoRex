import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { FRACTAE_CANON } from "../../functions/lib/specContract";
import Thumb from "../components/Thumb";

interface Candidate {
  genus: string; family: string | null; nOccurrences: number; earlyMa: number | null; lateMa: number | null; countries: string[];
  inProject: { inGame: boolean; drafts: { fractae: string; edition: string; status: string }[] };
}
interface DraftRow { id: number; genus: string; fractae: string; edition: string; status: string; updated_at: string }

const CLADES = [["Dinosauria", "Todos"], ["Theropoda", "Terópodos"], ["Sauropodomorpha", "Saurópodos"], ["Ornithopoda", "Ornitópodos"], ["Thyreophora", "Tireóforos"], ["Marginocephalia", "Marginocéfalos"]];
const INTERVALS = [["", "Cualquiera"], ["Triassic", "Triásico"], ["Jurassic", "Jurásico"], ["Cretaceous", "Cretácico"]];

export default function Discovery() {
  const nav = useNavigate();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [genera, setGenera] = useState<string[]>([]);
  const [via, setVia] = useState<string>("local");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fractae, setFractae] = useState("Furia");
  const [edition, setEdition] = useState("");
  const [q, setQ] = useState("");
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(null);
  const open = (src: string, caption: string) => setZoom({ src, caption });

  // As-you-type autocomplete (debounced). Dinosaur genera only.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setGenera([]); setAsked(""); return; }
    let live = true;
    const t = setTimeout(() => {
      api<{ genera: string[]; via: string }>(`/discovery/search?q=${encodeURIComponent(term)}`)
        .then((r) => { if (live) { setGenera(r.genera); setVia(r.via); setAsked(term); } })
        .catch((e: Error) => live && setError(e.message));
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const loadDrafts = () => api<{ drafts: DraftRow[] }>("/drafts").then((r) => setDrafts(r.drafts)).catch((e: Error) => setError(e.message));
  useEffect(() => { void loadDrafts(); }, []);

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (q.trim().length >= 2) return; // the name list already updates as you type
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(""); setCands(null);
    try {
      const p = new URLSearchParams({ baseName: String(f.get("clade")), interval: String(f.get("interval")), country: String(f.get("country")).trim().toUpperCase(), min: String(f.get("min")) });
      setCands((await api<{ candidates: Candidate[] }>(`/discovery/search?${p}`)).candidates);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function createDraft(genus: string) {
    setError("");
    try {
      const r = await api<{ id: number }>("/drafts", { method: "POST", body: JSON.stringify({ genus, fractae, edition }) });
      nav(`/discovery/${r.id}`);
    } catch (err) { setError((err as Error).message); }
  }

  const createBar = (genus: string) => <button onClick={() => createDraft(genus)}>Crear borrador</button>;

  return (
    <>
      <h2>Species Discovery</h2>
      {error && <p role="alert" className="error">{error}</p>}

      <section className="panel">
        <h3>Buscar candidatos (PBDB)</h3>
        <form className="row" onSubmit={search}>
          <label>Nombre (prefijo)<input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Steg, tiranosaurio, saurus…" autoComplete="off" /></label>
          <label>Clado<select name="clade">{CLADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Época<select name="interval">{INTERVALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>País (ISO)<input name="country" maxLength={2} placeholder="US" /></label>
          <label>Mín. fósiles<input name="min" type="number" min={1} defaultValue={5} /></label>
          <button disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button>
        </form>
        <p className="muted">Escribe parte del nombre (en cualquier posición), con erratas o en español: «tiranosaurio», «saurus», «triceratop». Sin nombre, se filtra por clado/época/país. Gratis.</p>

        <div className="row">
          <label>Fractae para el borrador
            <select value={fractae} onChange={(e) => setFractae(e.target.value)}>
              {FRACTAE_CANON.map((f) => <option key={f.name} value={f.name}>{f.name} ({f.latin})</option>)}
            </select>
          </label>
          <label>Edición (opcional)<input value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="Wave 2" /></label>
        </div>

        {asked && genera.length === 0 && <p className="muted">Sin coincidencias para «{asked}».</p>}
        {via === "wikipedia-es" && genera.length > 0 && <p className="muted">Resuelto por Wikipedia en español (nombre común → género).</p>}
        {genera.length > 0 && <ul className="list">{genera.map((g) => <li key={g}><Thumb genus={g} onOpen={open} /><b>{g}</b> {createBar(g)}</li>)}</ul>}
        {cands && (
          <table>
            <thead><tr><th /><th>Género</th><th>Familia</th><th>Fósiles</th><th>Ma</th><th>Países</th><th>En el proyecto</th><th /></tr></thead>
            <tbody>
              {cands.map((c) => (
                <tr key={c.genus}>
                  <td><Thumb genus={c.genus} onOpen={open} /></td><td><b>{c.genus}</b></td><td>{c.family ?? "—"}</td><td>{c.nOccurrences}</td>
                  <td>{c.earlyMa ?? "?"}–{c.lateMa ?? "?"}</td><td>{c.countries.slice(0, 4).join(", ")}</td>
                  <td>{c.inProject.inGame && <span className="tag">en juego</span>}{c.inProject.drafts.map((d, i) => <span className="tag" key={i}>{d.fractae}{d.edition ? ` · ${d.edition}` : ""}: {d.status}</span>)}</td>
                  <td>{createBar(c.genus)}</td>
                </tr>
              ))}
              {cands.length === 0 && <tr><td colSpan={8} className="muted">Sin resultados.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Borradores</h3>
        {drafts.length === 0 ? <p className="muted">Aún no hay borradores.</p> : (
          <table>
            <thead><tr><th>Género</th><th>Fractae</th><th>Edición</th><th>Estado</th><th>Actualizado</th></tr></thead>
            <tbody>{drafts.map((d) => (
              <tr key={d.id}><td><Link to={`/discovery/${d.id}`}>{d.genus}</Link></td><td>{d.fractae}</td><td>{d.edition || "—"}</td><td><span className="tag">{d.status}</span></td><td className="muted">{d.updated_at}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label={zoom.caption}>
          <figure><img src={zoom.src} alt={zoom.caption} referrerPolicy="no-referrer" /><figcaption>{zoom.caption} — recreación aproximada, no el fósil</figcaption></figure>
        </div>
      )}
    </>
  );
}
