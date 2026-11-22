type FetchFn = typeof fetch;
export interface DinosaurPicturesEntry {
  genus: string; intro: string | null; quickFacts: string[]; dietType: string | null; period: string | null; region: string | null;
}
export function fetchDinosaurPicturesOrg(genus: string, fetchFn?: FetchFn): Promise<DinosaurPicturesEntry | null>;
export function formatForPrompt(data: DinosaurPicturesEntry | null): string | null;
