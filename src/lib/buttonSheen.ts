// Foil buttons (design chosen 2026-11-18): a light sweep crosses the button
// when it is pressed. The sweep itself is CSS (`button.sheen` in index.css); this
// only re-triggers it on every press, because `:active` ends before the
// animation does.

const SHEEN_MS = 700;

/** Only plain buttons carry the foil background: buttons with their own class (nav tabs, FAB, close…) style themselves. */
export function isSheenTarget(button: HTMLButtonElement): boolean {
  if (button.disabled) return false;
  return button.classList.length === 0 || button.classList.contains("auth-submit");
}

export function installButtonSheen(doc: Document = document): () => void {
  const onDown = (event: Event) => {
    const target = event.target as Element | null;
    const button = target?.closest?.("button") as HTMLButtonElement | null;
    if (!button || !isSheenTarget(button)) return;
    button.classList.remove("sheen");
    void button.offsetWidth; // restart the animation if it was still running
    button.classList.add("sheen");
    window.setTimeout(() => button.classList.remove("sheen"), SHEEN_MS);
  };
  doc.addEventListener("pointerdown", onDown, { passive: true });
  return () => doc.removeEventListener("pointerdown", onDown);
}
