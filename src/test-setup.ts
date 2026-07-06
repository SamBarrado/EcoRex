import "@testing-library/jest-dom/vitest";

// jsdom ships its own native requestAnimationFrame that isn't hooked into
// vitest's fake timers, so components relying on rAF (e.g. to defer a
// transition to the next paint) never advance under vi.useFakeTimers() —
// especially when the mount happens nested inside an async timer flush.
// Routing it through setTimeout makes it a normal fake-timer citizen.
window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;

if (typeof window.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub;
}
