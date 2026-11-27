import { StrictMode } from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { XpToast } from "./XpToast";

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no Web Animations API: stub it so the orbs are launched.
  (Element.prototype as { animate?: unknown }).animate = vi.fn(() => ({ cancel: vi.fn(), onfinish: null }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (Element.prototype as { animate?: unknown }).animate;
  document.body.innerHTML = "";
});

const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("XpToast", () => {
  it("lets the orbs finish their flight when the screen moves on before they land", async () => {
    const view = render(<XpToast xpGained={20} onDone={() => {}} />);
    await wait(100);
    view.unmount(); // the player swipes the card away
    await wait(2000);
    expect(document.querySelectorAll(".xp-orb")).toHaveLength(4);
  });

  it("launches a single stream of orbs under StrictMode", async () => {
    render(
      <StrictMode>
        <XpToast xpGained={20} onDone={() => {}} />
      </StrictMode>,
    );
    await wait(2000);
    expect(document.querySelectorAll(".xp-orb")).toHaveLength(4);
  });

  it("goes away on time even if the screen re-renders meanwhile", async () => {
    const onDone = vi.fn();
    const view = render(<XpToast xpGained={20} onDone={() => onDone()} />);
    await wait(2000);
    view.rerender(<XpToast xpGained={20} onDone={() => onDone()} />);
    await wait(600);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
