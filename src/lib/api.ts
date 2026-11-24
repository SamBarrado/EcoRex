export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? "Ha ocurrido un problema en el servidor. Inténtalo de nuevo en unos segundos.");
  }

  return data as T;
}

export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  needs_username_setup?: boolean;
  avatar?: string | null;
}

export function register(body: { email: string; password: string; display_name: string }) {
  return request<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function login(body: { email: string; password: string }) {
  return request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function setAvatar(avatar: string | null) {
  return request<{ avatar: string | null }>("/api/auth/avatar", {
    method: "PATCH",
    body: JSON.stringify({ avatar }),
  });
}

export function setUsername(body: { display_name: string }) {
  return request<{ user: AuthUser }>("/api/auth/username", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export interface DexSlotLocked {
  species_id: number;
  phase: string;
  wave: number;
  /** False for the "???" placeholder species that hold a slot but can't be obtained yet. */
  playable?: boolean;
  locked: true;
}

export interface DexSlotRevealed {
  species_id: number;
  phase: string;
  wave: number;
  playable?: boolean;
  locked: false;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  rarity_name: string;
  rarity_slug: string;
  lore_phrase: string | null;
  image_url: string;
  discovery_code: string;
  discovered_at: string;
  count: number;
}

export type DexSlot = DexSlotLocked | DexSlotRevealed;

export function getDex() {
  return request<{ currentWave: number; slots: DexSlot[] }>("/api/collection/dex");
}

export interface ProfileStats {
  user: AuthUser;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  title: string;
  /** Playable species with at least one card, out of all playable species. */
  speciesDiscoveredCount: number;
  speciesTotalCount: number;
  /** EcoDex registries: species+phase combinations obtained at least once, out of all playable ones. */
  registeredCount: number;
  registeredTotalCount: number;
  /** Cards ever obtained (including those consumed by fusions). */
  totalDiscoveries: number;
  /** Active copies beyond the first of each registry. */
  repeatedCount: number;
  rarityBreakdown: { slug: string; name: string; count: number }[];
}

export function getMyProfile() {
  return request<ProfileStats>("/api/profile");
}

export interface EnergyState {
  remaining: number;
  max: number;
  resetAt: number | null;
  unlimited: boolean;
}

export function getEnergy() {
  return request<EnergyState>("/api/energy");
}

export interface MissionsState {
  day: string;
  missions: Array<{ slug: string; label: string; progress: number; target: number; completed: boolean; optional?: boolean }>;
  bonus: { completed: boolean; xp: number };
  streak: StreakState;
}

export interface StreakState {
  days: number;
  /** False when the streak is alive but hasn't been extended today yet. */
  activeToday: boolean;
  nextMilestone: number;
  nextMilestoneXp: number;
}

export function getMissions() {
  return request<MissionsState>("/api/missions");
}

export interface Species {
  id: number;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  fractae_id: number;
  fractae_slug: string;
  fractae_color: string | null;
}

export function getSpecies() {
  return request<{ species: Species[] }>("/api/species");
}

export interface DiscoverResult {
  discoveryId: number;
  discoveryCode: string;
  speciesId: number;
  scientificName: string;
  commonName: string;
  phase: string;
  rarityTier: { slug: string; name: string };
  imageUrl: string;
  lorePhrase: string | null;
  isNewSlot: boolean;
  discoveredAt: string;
  xp: { xpGained: number; totalXp: number; level: number; previousLevel: number; leveledUp: boolean };
  missionsCompleted: string[];
  dailyBonusAwarded: boolean;
  energyGained?: { levelUp: number; streak: number };
  streak?: { days: number; reward: { days: number; xp: number } | null };
}

export function discover(body: { phase: string }, signal?: AbortSignal) {
  return request<DiscoverResult>("/api/discover", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export interface EligibleSpecies {
  speciesId: number;
  commonName: string;
  scientificName: string;
  balanceAnchorUrl: string;
  balanceCount: number;
}

export interface FuseEligibleState {
  /** Duplicates of Balance needed to fuse (5, or 4 from level 15). */
  threshold: number;
  eligible: EligibleSpecies[];
  /** Species with some Balance duplicates that are still short, closest first. */
  progress: EligibleSpecies[];
}

export function getFuseEligible() {
  return request<Partial<FuseEligibleState> & { eligible: EligibleSpecies[] }>("/api/fuse/eligible");
}

export function fuseSpecies(body: { speciesId: number }, signal?: AbortSignal) {
  return request<DiscoverResult>("/api/fuse", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export interface AppNotification {
  id: number;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
}

export function getNotifications() {
  return request<{ notifications: AppNotification[] }>("/api/notifications");
}

export function markNotificationRead(id: number) {
  return request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "POST" });
}
