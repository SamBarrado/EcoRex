export interface TaxonGroup { label: string; baseNames: string[]; dinosaur: boolean; relatives: string[] }
export const GROUPS: Record<string, TaxonGroup>;
export const DEFAULT_GROUP: string;
export function resolveGroup(key?: string | null): (TaxonGroup & { key: string }) | null;
