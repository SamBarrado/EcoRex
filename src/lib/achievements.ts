import type { DiscoverResult } from "./api";

// Achievements are derived on the client from what a discovery/fusion response
// already says; the server only decides what was earned. Design chosen
// 2026-11-18 ("Mixta"): small things are banners, big ones are a medal.

export interface Achievement {
  id: string;
  /** banner = small, stacked at the top; medal = full-screen moment. */
  kind: "banner" | "medal";
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  /** Extra style hook (the Eco medal looks ghostly). */
  variant?: "eco";
  xp?: number;
  /** Medals only: runs when it is actually on screen (it may wait behind another). */
  onShow?: () => void;
}

const MISSION_BANNERS: Record<string, { title: string; subtitle: string }> = {
  percibir: { title: "Misión completada", subtitle: "Percibe hoy" },
  coleccionista: { title: "Misión completada", subtitle: "Consigue 3 cartas hoy" },
  fusion: { title: "Misión completada", subtitle: "Completa 1 fusión (extra)" },
};

/** Medals first (they interrupt), banners after: order = display order. */
export function achievementsFromResult(
  result: Pick<DiscoverResult, "missionsCompleted" | "dailyBonusAwarded" | "isNewSlot" | "phase" | "commonName" | "speciesCompleted" | "streak"> & {
    fractaeChildName?: string;
  },
): Achievement[] {
  const medals: Achievement[] = [];
  const banners: Achievement[] = [];
  const label = result.fractaeChildName ?? result.phase;

  if (result.phase === "eco" && result.isNewSlot) {
    medals.push({
      id: "eco",
      kind: "medal",
      icon: "👻",
      title: "¡Has percibido un Eco!",
      subtitle: `${result.commonName}: el eco extremo de una especie que ya conoces`,
      color: "#8fd8e8",
      variant: "eco",
    });
  } else if (result.isNewSlot) {
    medals.push({
      id: "species",
      kind: "medal",
      icon: "🦖",
      title: "¡Nueva especie registrada!",
      subtitle: `${result.commonName} · ${label}`,
      color: "#7fc891",
    });
  }

  if (result.speciesCompleted) {
    medals.push({
      id: "complete",
      kind: "medal",
      icon: "🏆",
      title: "Especie completa",
      subtitle: `Balance, Exceso y Eco de ${result.commonName}`,
      color: "#ffd54a",
    });
  }

  for (const slug of result.missionsCompleted ?? []) {
    if (slug === "bonus") {
      banners.push({ id: "bonus", kind: "banner", icon: "🎁", title: "Bonus del día", subtitle: "Has completado las misiones principales", color: "#4fa9e0" });
    } else if (MISSION_BANNERS[slug]) {
      banners.push({ id: `mission-${slug}`, kind: "banner", icon: "✅", ...MISSION_BANNERS[slug], color: "#3fae5a" });
    }
  }

  const reward = result.streak?.reward;
  if (reward) {
    banners.push({
      id: `streak-${reward.days}`,
      kind: "banner",
      icon: "🔥",
      title: `Racha de ${reward.days} días`,
      subtitle: "XP y +1 de energía",
      color: "#ffb74d",
      xp: reward.xp,
    });
  }

  return [...medals, ...banners];
}

/** The "Primeros pasos" prize: not derived from a discovery, the checklist raises it. */
export const FIRST_STEPS_ACHIEVEMENT: Achievement = {
  id: "firststeps",
  kind: "medal",
  icon: "🎓",
  title: "Primeros pasos completados",
  subtitle: "+50 XP y la energía al máximo",
  color: "#ffd54a",
};
