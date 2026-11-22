export function normalize(s: string): string;
export function phonetic(s: string): string;
export function levenshtein(a: string, b: string, max?: number): number;
export function queryVariants(query: string): string[];
export function rankGenera(genera: string[], query: string, limit?: number): string[];
