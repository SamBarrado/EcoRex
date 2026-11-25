import { describe, it, expect, afterEach, vi } from "vitest";
import { flyOrbs, orbCountFor } from "./xpOrbs";

describe("orbCountFor", () => {
  it("scales with XP between 3 and 10 orbs", () => {
    expect(orbCountFor(1)).toBe(3);
    expect(orbCountFor(25)).toBe(5);
    expect(orbCountFor(500)).toBe(10);
  });
});

describe("flyOrbs", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
    document.body.innerHTML = "";
  });

  function source() {
    const el = document.createElement("div");
    // jsdom has no Web Animations API: stub it on every element (orbs are created by the module).
    (Element.prototype as { animate?: unknown }).animate = vi.fn(() => ({ cancel: vi.fn(), onfinish: null }));
    document.body.appendChild(el);
    return el;
  }

  it("does nothing under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const el = source();
    flyOrbs({ from: el, amount: 20 });
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });

  it("does nothing where the Web Animations API is missing", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(() => flyOrbs({ from: el, amount: 20 })).not.toThrow();
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });

  it("launches one staggered orb per step and cleans up on cancel", () => {
    vi.useFakeTimers();
    const el = source();
    const cancel = flyOrbs({ from: el, amount: 20 }); // 4 orbs
    expect(document.querySelectorAll(".xp-orb")).toHaveLength(0);
    vi.advanceTimersByTime(5000);
    expect(document.querySelectorAll(".xp-orb")).toHaveLength(4);
    cancel();
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });
});
