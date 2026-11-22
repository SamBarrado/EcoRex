import { useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Img { thumbnail: string | null; originalImage: string | null; pageUrl: string | null; title: string | null; source?: "commons" | "fandom" | null; throttled?: boolean }
const NONE: Img = { source: null, thumbnail: null, originalImage: null, pageUrl: null, title: null };

// Wikimedia throttles bursts, so pictures are fetched through a small queue
// (2 at a time), only when they scroll into view, and remembered per genus.
const MAX_PARALLEL = 2;
const results = new Map<string, Promise<Img>>();
let running = 0;
const waiting: (() => void)[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function slot<T>(job: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await job(); } finally { running--; waiting.shift()?.(); }
}

async function fetchImage(genus: string): Promise<Img> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await slot(() => api<Img>(`/discovery/image?genus=${encodeURIComponent(genus)}`)).catch(() => NONE);
    if (!r.throttled) return r;
    await sleep(2500 * (attempt + 1)); // Commons asked us to slow down
  }
  return NONE;
}
const load = (genus: string) => {
  if (!results.has(genus)) results.set(genus, fetchImage(genus));
  return results.get(genus)!;
};

/** Approximate picture of the genus (a reconstruction from Wikimedia Commons, not the fossil). Click to enlarge. */
export default function Thumb({ genus, onOpen }: { genus: string; onOpen: (src: string, caption: string) => void }) {
  const [img, setImg] = useState<Img | null>(null);
  const [visible, setVisible] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisible(true), io.disconnect()), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    void load(genus).then((r) => live && setImg(r));
    return () => { live = false; };
  }, [genus, visible]);

  if (img?.thumbnail)
    return (
      <img className="thumb" src={img.thumbnail} alt={`Recreación de ${genus}`} loading="lazy" referrerPolicy="no-referrer"
        title={`${img.title ?? ""} — ${img.source === "fandom" ? "Prehistoria Fandom (menos filtrada)" : "Wikimedia Commons"}. Recreación aproximada, no el fósil. Clic para ampliar`} onClick={() => onOpen(img.originalImage ?? img.thumbnail!, genus)} />
    );
  return (
    <div ref={box} className="thumb ph" title={img ? "Sin recreación en Commons ni Prehistoria Fandom" : "Cargando imagen…"}>
      {img ? "—" : ""}
    </div>
  );
}
