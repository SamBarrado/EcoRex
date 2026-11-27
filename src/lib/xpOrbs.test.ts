import { describe, it, expect, afterEach, vi } from "vitest";
import { flyOrbs, onXpFlight, orbCountFor } from "./xpOrbs";

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

  // jsdom has no Web Animations API: stub it on every element (orbs are created by the module).
  function stubAnimate() {
    const animate = vi.fn((_frames: Keyframe[], _timing: KeyframeAnimationOptions) => ({ cancel: vi.fn(), onfinish: null }));
    (Element.prototype as { animate?: unknown }).animate = animate;
    return animate;
  }

  it("does nothing under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    stubAnimate();
    flyOrbs({ amount: 20 });
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });

  it("does nothing where the Web Animations API is missing", () => {
    expect(() => flyOrbs({ amount: 20 })).not.toThrow();
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });

  it("launches one staggered orb per step and cleans up on cancel", () => {
    vi.useFakeTimers();
    stubAnimate();
    const cancel = flyOrbs({ amount: 20 }); // 4 orbs
    expect(document.querySelectorAll(".xp-orb")).toHaveLength(0);
    vi.advanceTimersByTime(5000);
    expect(document.querySelectorAll(".xp-orb")).toHaveLength(4);
    cancel();
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });

  it("removes its own layer once the last orb has landed", () => {
    vi.useFakeTimers();
    const flights: Array<{ onfinish: (() => void) | null }> = [];
    (Element.prototype as { animate?: unknown }).animate = vi.fn(() => {
      const flight = { cancel: vi.fn(), onfinish: null as (() => void) | null };
      flights.push(flight);
      return flight;
    });
    flyOrbs({ amount: 20 }); // 4 orbs
    vi.advanceTimersByTime(5000);
    flights.slice(0, 3).forEach((f) => f.onfinish?.());
    expect(document.querySelector(".xp-orb-layer")).not.toBeNull();
    flights[3].onfinish?.();
    expect(document.querySelector(".xp-orb-layer")).toBeNull();
  });

  it("starts at the centre of the screen and takes 900 ms to reach the ring corner", () => {
    vi.useFakeTimers();
    const animate = stubAnimate();
    flyOrbs({ amount: 20 });
    vi.advanceTimersByTime(5000);

    const [frames, timing] = animate.mock.calls[0];
    const centre = `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px)`;
    expect(String(frames[0].transform)).toContain(centre);
    // Fully visible while still at the centre, so the origin is noticed.
    expect(String(frames[1].transform)).toContain(`${window.innerHeight / 2}px)`);
    expect(frames[1].opacity).toBe(1);
    expect(timing.duration).toBe(900);
  });

  it("announces when the first and the last orb land, even where nothing is animated", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const listener = vi.fn();
    const unsubscribe = onXpFlight(listener);
    flyOrbs({ amount: 20 }); // 4 orbs: 350 ms to start, 70 ms apart, 900 ms each
    expect(listener).toHaveBeenCalledWith({ firstLandingMs: 1250, lastLandingMs: 1460 });

    unsubscribe();
    flyOrbs({ amount: 20 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
