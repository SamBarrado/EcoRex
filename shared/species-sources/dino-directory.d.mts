type FetchFn = typeof fetch;
export interface DinoDirectoryEntry {
  genus: string; species: string | null; nameMeaning: string | null; namePronounciation: string | null;
  period: string | null; myaFrom: number | null; myaTo: number | null;
  lengthFromMeters: number | null; lengthToMeters: number | null; dietType: string | null;
  bodyShape: string | null; bodyShapeDescription: string | null; locomotion: string | null;
  taxonomy: string | null; countries: string[]; description: string | null;
}
export function fetchDinoDirectory(genus: string, fetchFn?: FetchFn): Promise<DinoDirectoryEntry | null>;
export function formatForPrompt(data: DinoDirectoryEntry | null): string | null;
