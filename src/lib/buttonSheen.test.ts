import { describe, it, expect, vi, afterEach } from "vitest";
import { installButtonSheen, isSheenTarget } from "./buttonSheen";

function press(el: Element) {
  el.dispatchEvent(new Event("pointerdown", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("isSheenTarget", () => {
  it("accepts plain and auth-submit buttons", () => {
    const plain = document.createElement("button");
    const auth = document.createElement("button");
    auth.className = "auth-submit";
    expect(isSheenTarget(plain)).toBe(true);
    expect(isSheenTarget(auth)).toBe(true);
  });

  it("rejects disabled buttons and buttons that style themselves", () => {
    const disabled = document.createElement("button");
    disabled.disabled = true;
    const nav = document.createElement("button");
    nav.className = "bottom-nav-tab";
    const secondary = document.createElement("button");
    secondary.className = "btn-secondary";
    expect(isSheenTarget(disabled)).toBe(false);
    expect(isSheenTarget(nav)).toBe(false);
    expect(isSheenTarget(secondary)).toBe(false);
  });
});

describe("installButtonSheen", () => {
  it("adds the sheen class on press and removes it afterwards", () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<button id="b">Go</button>';
    const off = installButtonSheen();
    const b = document.getElementById("b")!;
    press(b);
    expect(b).toHaveClass("sheen");
    vi.advanceTimersByTime(800);
    expect(b).not.toHaveClass("sheen");
    off();
  });

  it("works when the press lands on a child of the button", () => {
    document.body.innerHTML = '<button id="b"><span id="s">Go</span></button>';
    const off = installButtonSheen();
    press(document.getElementById("s")!);
    expect(document.getElementById("b")).toHaveClass("sheen");
    off();
  });

  it("ignores non-sheen buttons and stops listening once uninstalled", () => {
    document.body.innerHTML = '<button id="nav" class="bottom-nav-tab">x</button><button id="b">y</button>';
    const off = installButtonSheen();
    press(document.getElementById("nav")!);
    expect(document.getElementById("nav")).not.toHaveClass("sheen");
    off();
    press(document.getElementById("b")!);
    expect(document.getElementById("b")).not.toHaveClass("sheen");
  });
});
