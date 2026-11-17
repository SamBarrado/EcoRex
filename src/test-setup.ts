import "@testing-library/jest-dom/vitest";

// jsdom ships its own native requestAnimationFrame that isn't hooked into
// vitest's fake timers, so components relying on rAF (e.g. to defer a
// transition to the next paint) never advance under vi.useFakeTimers() —
// especially when the mount happens nested inside an async timer flush.
// Routing it through setTimeout makes it a normal fake-timer citizen.
// One frame is 16ms: CardScene's motion loop re-schedules itself every frame, so
// a 0ms delay would spin forever at the same fake-timer instant.
window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
window.cancelAnimationFrame = (id: number) => clearTimeout(id);

if (typeof window.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub;
}
