export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <h2>{title}</h2>
      <p className="muted">Aún no implementado — {phase}.</p>
    </>
  );
}
