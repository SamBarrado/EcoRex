import { describe, it, expect } from "vitest";
import { achievementsFromResult } from "./achievements";

const base = {
  missionsCompleted: [] as string[],
  dailyBonusAwarded: false,
  isNewSlot: false,
  phase: "balance",
  commonName: "Test Dino",
  speciesCompleted: false,
  streak: { days: 1, reward: null },
};

const ids = (r: Parameters<typeof achievementsFromResult>[0]) => achievementsFromResult(r).map((a) => a.id);

describe("achievementsFromResult", () => {
  it("is empty for an ordinary duplicate", () => {
    expect(achievementsFromResult(base)).toEqual([]);
  });

  it("gives a medal for a new species", () => {
    const [a] = achievementsFromResult({ ...base, isNewSlot: true, fractaeChildName: "Testa" });
    expect(a).toMatchObject({ id: "species", kind: "medal", subtitle: "Test Dino · Testa" });
  });

  it("gives the Eco medal (not the new-species one) for a new Eco record", () => {
    const list = achievementsFromResult({ ...base, isNewSlot: true, phase: "eco" });
    expect(list.map((a) => a.id)).toEqual(["eco"]);
    expect(list[0].variant).toBe("eco");
  });

  it("gives a medal when the species is completed, after the new-species one", () => {
    expect(ids({ ...base, isNewSlot: true, speciesCompleted: true })).toEqual(["species", "complete"]);
  });

  it("turns missions, the daily bonus and a streak milestone into banners, medals first", () => {
    const list = achievementsFromResult({
      ...base,
      isNewSlot: true,
      missionsCompleted: ["percibir", "coleccionista", "bonus"],
      streak: { days: 3, reward: { days: 3, xp: 20 } },
    });
    expect(list.map((a) => a.id)).toEqual(["species", "mission-percibir", "mission-coleccionista", "bonus", "streak-3"]);
    expect(list.filter((a) => a.kind === "banner")).toHaveLength(4);
    expect(list.find((a) => a.id === "streak-3")?.xp).toBe(20);
  });

  it("ignores unknown mission slugs", () => {
    expect(achievementsFromResult({ ...base, missionsCompleted: ["inventada"] })).toEqual([]);
  });
});
