import { describe, it, expect } from "vitest";
import { getDraft } from "./drafts";
import { activateDraft, deactivateDraft, parseWave, promoteDraft, unpromoteDraft } from "./promotion";
import { makeD1 } from "./testD1";
// Data only (tests may read tools/ JSON; application code must not).
import lote from "../../../tools/species/lote.json";

const COMPLETE: any = (lote as any[]).find((s) => s.habitatSlug && s.lorePhrase && s.scientificName.startsWith("Tyrannosaurus rex furibundus"));

function setup(status = "approved", spec: unknown = COMPLETE) {
  const db: any = makeD1();
  db.sqlite.prepare("INSERT INTO fractae (id, slug, latin_name, child_name) VALUES (1, 'furia', 'Ira', 'Furia')").run();
  // Reserved Dex slots as in scripts/seed.sql: id 7 (Furia) and 8 (Sorpresa) in wave 1, id 9 (Furia) in wave 2.
  for (const [id, f, w] of [[7, 1, 1], [8, 2, 1], [9, 1, 2]]) {
    if (f === 2) db.sqlite.prepare("INSERT INTO fractae (id, slug, latin_name, child_name) VALUES (2, 'sorpresa', 'Stupor', 'Sorpresa')").run();
    db.sqlite.prepare("INSERT INTO species (id, scientific_name, common_name, fractae_id, launch_wave, is_active) VALUES (?, '???', '???', ?, ?, 0)").run(id, f, w);
  }
  db.sqlite
    .prepare("INSERT INTO species_drafts (id, genus, fractae, status, spec_json, created_by) VALUES (1, 'Tyrannosaurus', 'Furia', ?, ?, 1)")
    .run(status, JSON.stringify(spec));
  return db;
}

describe("promoteDraft / unpromoteDraft", () => {
  it("fills a reserved '???' slot IN PLACE (same id, own Fractae first) and stays inactive", async () => {
    const db = setup();
    expect(await promoteDraft(db, (await getDraft(db, 1))!, 1)).toEqual({ ok: true });
    expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM species").get().n).toBe(3); // no new row
    expect(db.sqlite.prepare("SELECT * FROM species WHERE id = 7").get()).toMatchObject({ scientific_name: COMPLETE.scientificName, common_name: COMPLETE.commonName, fractae_id: 1, launch_wave: 1, is_active: 0 });
    expect(db.sqlite.prepare("SELECT scientific_name FROM species WHERE id = 8").get().scientific_name).toBe("???");
    expect(await getDraft(db, 1)).toMatchObject({ status: "promoted", species_id: 7 });
  });

  it("falls back to another slot of the wave when its Fractae has none, and refuses a full wave", async () => {
    const db = setup();
    db.sqlite.prepare("UPDATE species SET scientific_name = 'X', common_name = 'X' WHERE id = 7").run(); // Furia slot taken
    await promoteDraft(db, (await getDraft(db, 1))!, 1);
    expect((await getDraft(db, 1))!.species_id).toBe(8);
    expect(db.sqlite.prepare("SELECT fractae_id FROM species WHERE id = 8").get().fractae_id).toBe(1);

    const full = setup();
    full.sqlite.prepare("UPDATE species SET scientific_name = 'X' WHERE launch_wave = 1").run();
    expect((await promoteDraft(full, (await getDraft(full, 1))!, 1)) as any).toMatchObject({ ok: false, status: 409 });
    expect((await getDraft(full, 1))!.status).toBe("approved");
  });

  it("refuses drafts that are not approved, incomplete sheets, unknown Fractae and duplicates", async () => {
    const notApproved = setup("spec_draft");
    expect((await promoteDraft(notApproved, (await getDraft(notApproved, 1))!, 1)) as any).toMatchObject({ ok: false, status: 409 });

    const incomplete = setup("approved", { ...COMPLETE, habitatSlug: undefined });
    expect((await promoteDraft(incomplete, (await getDraft(incomplete, 1))!, 1)) as any).toMatchObject({ ok: false, status: 422 });

    const noFractae = setup();
    noFractae.sqlite.exec("PRAGMA foreign_keys = OFF; UPDATE species SET fractae_id = 1; DELETE FROM fractae WHERE id = 1");
    expect((await promoteDraft(noFractae, (await getDraft(noFractae, 1))!, 1)) as any).toMatchObject({ ok: false, status: 422 });

    const dup = setup();
    dup.sqlite.prepare("UPDATE species SET scientific_name = ? WHERE id = 9").run(COMPLETE.scientificName);
    expect((await promoteDraft(dup, (await getDraft(dup, 1))!, 1)) as any).toMatchObject({ ok: false, status: 409 });
  });

  it("undoing a promotion puts the slot back to '???' (id kept) while inactive, art-less and undiscovered", async () => {
    const db = setup();
    await promoteDraft(db, (await getDraft(db, 1))!, 1);
    expect(await unpromoteDraft(db, (await getDraft(db, 1))!)).toEqual({ ok: true });
    expect(db.sqlite.prepare("SELECT * FROM species WHERE id = 7").get()).toMatchObject({ scientific_name: "???", common_name: "???", physical_traits: null, is_active: 0 });
    expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM species").get().n).toBe(3);
    expect(await getDraft(db, 1)).toMatchObject({ status: "approved", species_id: null });
  });

  it("refuses to undo when the species went live or got art", async () => {
    for (const sql of ["UPDATE species SET is_active = 1 WHERE id = 7", "INSERT INTO species_phase_anchors (species_id, phase, image_url) VALUES (7, 'balance', '/x.webp')"]) {
      const db = setup();
      await promoteDraft(db, (await getDraft(db, 1))!, 1);
      db.sqlite.exec(sql);
      expect((await unpromoteDraft(db, (await getDraft(db, 1))!)) as any).toMatchObject({ ok: false, status: 409 });
      expect(db.sqlite.prepare("SELECT common_name FROM species WHERE id = 7").get().common_name).toBe(COMPLETE.commonName);
    }
  });

  const imgFetch = (have: string[]) => (async (url: string) => {
    const ok = have.some((p) => String(url).includes(`/${p}.webp`));
    // Pages answers a missing file with index.html and 200: only the content-type tells.
    return new Response("", { status: 200, headers: { "content-type": ok ? "image/webp" : "text/html" } });
  }) as unknown as typeof fetch;

  it("activates only when all three images are published; Balance alone carries the lore", async () => {
    const db = setup();
    await promoteDraft(db, (await getDraft(db, 1))!, 1);
    const d = (await getDraft(db, 1))!;
    const r = (await activateDraft(db, d, "https://pwa.test", imgFetch(["balance", "eco"]))) as any;
    expect(r).toMatchObject({ ok: false, status: 422 });
    expect(r.error).toContain("exceso");
    expect(db.sqlite.prepare("SELECT is_active FROM species WHERE id = 7").get().is_active).toBe(0);
    expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM species_phase_anchors").get().n).toBe(0);

    expect(await activateDraft(db, d, "https://pwa.test", imgFetch(["balance", "exceso", "eco"]))).toEqual({ ok: true });
    expect(db.sqlite.prepare("SELECT is_active FROM species WHERE id = 7").get().is_active).toBe(1);
    const slug = COMPLETE.scientificName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const anchors = db.sqlite.prepare("SELECT phase, image_url, lore_phrase FROM species_phase_anchors ORDER BY id").all();
    expect(anchors.map((a: any) => [a.phase, a.image_url])).toEqual([["balance", `/species-art/${slug}/balance.webp`], ["exceso", `/species-art/${slug}/exceso.webp`], ["eco", `/species-art/${slug}/eco.webp`]]);
    expect(anchors.map((a: any) => a.lore_phrase)).toEqual([COMPLETE.lorePhrase, null, null]);
    expect((await activateDraft(db, d, "https://pwa.test", imgFetch(["balance", "exceso", "eco"]))) as any).toMatchObject({ ok: false, status: 409 });
  });

  it("refuses to activate a draft that is not promoted", async () => {
    const db = setup();
    expect((await activateDraft(db, (await getDraft(db, 1))!, "https://pwa.test", imgFetch([]))) as any).toMatchObject({ ok: false, status: 409 });
  });

  it("deactivates (anchors removed) only while no player has a card", async () => {
    const db = setup();
    await promoteDraft(db, (await getDraft(db, 1))!, 1);
    await activateDraft(db, (await getDraft(db, 1))!, "https://pwa.test", imgFetch(["balance", "exceso", "eco"]));
    expect(await deactivateDraft(db, (await getDraft(db, 1))!)).toEqual({ ok: true });
    expect(db.sqlite.prepare("SELECT is_active FROM species WHERE id = 7").get().is_active).toBe(0);
    expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM species_phase_anchors").get().n).toBe(0);
    // and then it can be unpromoted again
    expect(await unpromoteDraft(db, (await getDraft(db, 1))!)).toEqual({ ok: true });
  });

  it("validates the wave", () => {
    expect([parseWave(1), parseWave("12"), parseWave(0), parseWave(100), parseWave(1.5), parseWave("x")]).toEqual([1, 12, null, null, null, null]);
  });
});
