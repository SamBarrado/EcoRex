import { useEffect, useState } from "react";
import { api } from "../api";

interface Data {
  species: { total: number; active: number };
  anchorsByPhase: Record<string, number>;
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Data>("/dashboard").then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <p className="muted">Cargando…</p>;
  return (
    <>
      <h2>Dashboard</h2>
      <div className="cards">
        <div className="card"><b>{data.species.active}</b><span>especies activas en el juego</span></div>
        <div className="card"><b>{data.species.total}</b><span>especies en la base de datos</span></div>
        {["balance", "exceso", "eco"].map((phase) => (
          <div className="card" key={phase}><b>{data.anchorsByPhase[phase] ?? 0}</b><span>anclas {phase}</span></div>
        ))}
      </div>
    </>
  );
}
