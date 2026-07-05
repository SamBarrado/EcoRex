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
    throw new ApiError(response.status, data?.error ?? "Error inesperado");
  }

  return data as T;
}

export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
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

export function logout() {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export interface DexSlotLocked {
  species_id: number;
  phase: string;
  wave: number;
  locked: true;
}

export interface DexSlotRevealed {
  species_id: number;
  phase: string;
  wave: number;
  locked: false;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  rarity_name: string;
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
  speciesDiscoveredCount: number;
  speciesTotalCount: number;
  totalDiscoveries: number;
  duplicateCount: number;
  rarityBreakdown: { slug: string; name: string; count: number }[];
}

export function getMyProfile() {
  return request<ProfileStats>("/api/profile");
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
  isUniqueVariant: boolean;
  discoveredAt: string;
  xp: { xpGained: number; totalXp: number; level: number; leveledUp: boolean };
}

export function discover(body: { speciesId: number; phase: string }, signal?: AbortSignal) {
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
  calmaAnchorUrl: string;
  calmaCount: number;
}

export function getFuseEligible() {
  return request<{ eligible: EligibleSpecies[] }>("/api/fuse/eligible");
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
