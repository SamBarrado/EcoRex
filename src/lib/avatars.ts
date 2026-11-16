// Default profile avatars, served from public/avatars/. Keep the ids in sync
// with AVATAR_IDS in functions/api/auth/avatar.ts.
export const AVATAR_IDS = ["avatar-1", "avatar-2", "avatar-3"] as const;

export function avatarUrl(id: string): string {
  return `/avatars/${id}.webp`;
}
