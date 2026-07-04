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

export interface Discovery {
  discovery_id: number;
  discovery_code: string;
  phase: string;
  image_url: string;
  is_unique_variant: number;
  discovered_at: string;
  species_id: number;
  scientific_name: string;
  common_name: string;
  fractae_id: number;
  fractae_slug: string;
  fractae_child_name: string;
  rarity_tier_id: number;
  rarity_slug: string;
  rarity_name: string;
}

export function getMyCollection() {
  return request<{ discoveries: Discovery[] }>("/api/collection/mine");
}

export interface ProfileStats {
  user: AuthUser;
  explorerRank: string;
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
}

export function discover(body: { speciesId: number; phase: string }) {
  return request<DiscoverResult>("/api/discover", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
