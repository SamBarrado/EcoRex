import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

interface Row { id: number; scientific_name: string; common_name: string; fractae: string; launch_wave: number; is_active: number; phases: string | null; draft_id: number | null }
interface Approved { id: number; genus: string; fractae: string; edition: string; common_name: string | null }

const PHASES = ["balance", "exceso", "eco"];

export default function Species() {
  const [data, setData] = useState<{ species: Row[]; approved: Approved[]; freeSlots: { wave: number; n: number }[] } | null>(null);
  const [q, setQ] = useState("");
  const [fractae, setFractae] = useState("");
  const [wave, setWave] = useState("");
  const [state, setState] = useState(""); // "" | active | inactive | slot
  const [showSlots, setShowSlots] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api<{ species: Row[]; approved: Approved[]; freeSlots: { wave: number; n: number }[] }>("/species").then(setData).catch((e: Error) => setError(e.message)); }, []);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <p className="muted">Cargando…</p>;
  const needle = q.trim().toLowerCase();
  const isSlot = (s: Row) => s.scientific_name === "???";
  const kind = (s: Row) => (isSlot(s) ? "slot" : s.is_active ? "active" : "inactive");
  const fractaes = [...new Set(data.species.map((s) => s.fractae))].sort();
  const waves = [...new Set(data.species.map((s) => s.launch_wave))].sort((a, b) => a - b);
  const rows = data.species.filter(
    (s) =>
      (showSlots || state === "slot" || !isSlot(s)) &&
      (!fractae || s.fractae === fractae) &&
      (!wave || s.launch_wave === Number(wave)) &&
      (!state || kind(s) === state) &&
      (!needle || `${s.scientific_name} ${s.common_name}`.toLowerCase().includes(needle))
  );
  const filtered = !!(q || fractae || wave || state);
  const clear = () => { setQ(""); setFractae(""); setWave(""); setState(""); };

  return (
    <>
      <h2>Bestiario</h2>
      <section className="panel">
        <h3>Huecos «???» libres por oleada</h3>
        <p>{data.freeSlots.length ? data.freeSlots.map((f) => <span key={f.wave} className="tag">Oleada {f.wave}: {f.n}</span>) : "Ninguno"}</p>
        <p className="muted">Promover una ficha ocupa el hueco de su Fractae (mismo id) en la oleada elegida; si ese Fractae no tiene hueco libre ahí, se rechaza.</p>
      </section>
      <section className="panel">
        <h3>Fichas aprobadas, listas para promover ({data.approved.length})</h3>
        {data.approved.length === 0 && <p className="muted">Ninguna. Aprueba una ficha en Species Discovery.</p>}
        <ul className="list">
          {data.approved.map((d) => (
            <li key={d.id}><Link to={`/discovery/${d.id}`}>{d.common_name || d.genus}</Link><span className="tag">{d.fractae}</span>{d.edition && <span className="muted">{d.edition}</span>}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Especies en la base de datos ({rows.length} de {data.species.length})</h3>
        <div className="row">
          <label>Especie<input placeholder="Nombre común o científico…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <label>Fractae
            <select value={fractae} onChange={(e) => setFractae(e.target.value)}>
              <option value="">Todos</option>{fractaes.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label>Oleada
            <select value={wave} onChange={(e) => setWave(e.target.value)}>
              <option value="">Todas</option>{waves.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
          <label>Estado
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Todos</option><option value="active">Activa</option><option value="inactive">Inactiva (con ficha)</option><option value="slot">Hueco «???»</option>
            </select>
          </label>
          <label><input type="checkbox" checked={showSlots} onChange={(e) => setShowSlots(e.target.checked)} /> Mostrar huecos «???»</label>
          {filtered && <button className="btn-secondary" onClick={clear}>Limpiar filtros</button>}
        </div>
        <table>
          <thead><tr><th>Especie</th><th>Fractae</th><th>Oleada</th><th>Estado</th><th>Arte</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="muted">Ninguna especie con esos filtros.</td></tr>}
            {rows.map((s) => {
              const have = (s.phases ?? "").split(",");
              return (
                <tr key={s.id}>
                  <td>{s.draft_id ? <Link to={`/discovery/${s.draft_id}`}>{s.common_name}</Link> : s.common_name}<br /><span className="muted"><i>{s.scientific_name}</i></span></td>
                  <td>{s.fractae}</td>
                  <td>{s.launch_wave}</td>
                  <td><span className="tag">{kind(s) === "active" ? "activa" : kind(s) === "slot" ? "hueco" : "inactiva"}</span></td>
                  <td>{PHASES.map((p) => <span key={p} className="tag" title={p}>{have.includes(p) ? "✓" : "·"} {p}</span>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
