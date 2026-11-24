import type { DiscoverResult } from "./api";

/** Short toast note for a streak milestone reached by this action, if any. */
export function streakRewardNote(result: Pick<DiscoverResult, "streak">): string | undefined {
  const reward = result.streak?.reward;
  return reward ? `🔥 Racha de ${reward.days} días · ⚡ +1 de energía` : undefined;
}

export function streakLabel(days: number): string {
  return days === 1 ? "1 día seguido" : `${days} días seguidos`;
}
