type FetchFn = typeof fetch;
export interface PbdbTaxon {
  taxonName: string; rank: string; attribution: string | null; isSynonym: boolean; acceptedName: string | null;
  earlyInterval: string | null; lateInterval: string | null; earlyMa: number | null; lateMa: number | null;
  nOccurrences: number | null;
  classification: { phylum: string | null; class: string | null; order: string | null; family: string | null };
  countries: string[];
}
export interface PbdbCandidate {
  genus: string; family: string | null; nOccurrences: number; earlyMa: number | null; lateMa: number | null; countries: string[];
}
export function fetchPbdbTaxon(genus: string, fetchFn?: FetchFn): Promise<PbdbTaxon | null>;
export function formatForPrompt(data: PbdbTaxon | null): string | null;
export function searchPbdbTaxa(
  criteria: { baseName?: string; interval?: string; country?: string; minOccurrences?: number },
  fetchFn?: FetchFn
): Promise<PbdbCandidate[]>;
export function autocompleteDinosaurGenus(prefix: string, fetchFn?: FetchFn): Promise<string[]>;
export function listDinosaurGenera(fetchFn?: FetchFn): Promise<string[]>;
export function listGenera(baseNames: string | string[], fetchFn?: FetchFn): Promise<string[]>;
