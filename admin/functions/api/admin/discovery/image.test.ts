import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet } from "./image";

const call = (q: string, role = "content_editor") =>
  onRequestGet({ request: new Request(`https://a.test/api/admin/discovery/image?genus=${q}`), env: {}, data: { admin: { role, user: { id: 1 } } } } as never) as Promise<Response>;
afterEach(() => vi.unstubAllGlobals());

const commons = (titles: string[]) =>
  new Response(JSON.stringify({ query: { pages: Object.fromEntries(titles.map((t, i) => [String(i), { title: `File:${t}`, index: i + 1, imageinfo: [{ thumburl: `https://t/${t}`, url: `https://o/${t}`, descriptionurl: `https://d/${t}` }] }])) } }));

describe("GET /api/admin/discovery/image", () => {
  it("picks the life restoration, asks Commons once and sends a descriptive User-Agent", async () => {
    const f = vi.fn(async () => commons(["Parasaurolophus skulls.jpg", "Life reconstruction of Parasaurolophus walkeri.png"]));
    vi.stubGlobal("fetch", f);
    const body = (await (await call("Parasaurolophus")).json()) as { thumbnail: string; title: string };
    expect(body.title).toBe("File:Life reconstruction of Parasaurolophus walkeri.png");
    expect(body.thumbnail).toContain("https://t/");
    expect(f).toHaveBeenCalledTimes(1);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^EcorexAdmin\/1\.0/);
  });
  const fandom = (src: string | null) =>
    new Response(JSON.stringify({ query: { pages: { "1": src ? { title: "X", thumbnail: { source: `https://static.wikia.nocookie.net/p/images/0/0d/${src}/revision/latest/scale-to-width-down/330` }, original: { source: `https://static.wikia.nocookie.net/p/images/0/0d/${src}/revision/latest` } } : { title: "X", missing: "" } } } }));
  const routed = (c: string[], f: Response) => vi.fn(async (u: string) => (String(u).includes("fandom.com") ? f : commons(c)));

  it("falls back to Prehistoria Fandom when Commons has nothing suitable, and says so", async () => {
    vi.stubGlobal("fetch", routed(["Stegouros skull.jpg"], fandom("Stegouros_elengassen.jpeg")));
    expect(await (await call("Stegouros")).json()).toMatchObject({ source: "fandom", title: "Stegouros_elengassen.jpeg" });
  });
  it("prefers Commons over Fandom and does not call Fandom then", async () => {
    const f = routed(["Ceratosaurus life restoration.png"], fandom("Whatever.jpg"));
    vi.stubGlobal("fetch", f);
    expect(await (await call("Ceratosaurus")).json()).toMatchObject({ source: "commons" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("screens Fandom's picture by filename too (no skulls) and handles a missing page", async () => {
    vi.stubGlobal("fetch", routed([], fandom("Nopeosaurus_skull.jpg")));
    expect(((await (await call("Nopeosaurus")).json()) as { thumbnail: null }).thumbnail).toBeNull();
    vi.stubGlobal("fetch", routed([], fandom(null)));
    expect(((await (await call("Nopeosaurus")).json()) as { thumbnail: null }).thumbnail).toBeNull();
  });
  it("returns no picture when only fossils exist", async () => {
    vi.stubGlobal("fetch", routed(["Nopeosaurus skull.jpg", "Nopeosaurus fossil.jpg"], fandom(null)));
    expect(((await (await call("Nopeosaurus")).json()) as { thumbnail: null }).thumbnail).toBeNull();
  });
  it("flags throttling instead of caching it as 'no picture'", async () => {
    vi.stubGlobal("fetch", async () => new Response("You are making too many requests", { status: 429 }));
    expect(await (await call("Stegosaurus")).json()).toMatchObject({ thumbnail: null, throttled: true });
  });
  it("never breaks the search on network errors", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("net"); });
    expect((await call("Stegosaurus")).status).toBe(200);
  });
  it("rejects a malformed genus without calling out", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await call("a/../b")).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it("is closed to art_editor", async () => {
    expect((await call("Stegosaurus", "art_editor")).status).toBe(403);
  });
});
