type FetchFn = typeof fetch;
export interface WikipediaSummary { lang: string; title: string; extract: string; url: string }
export interface WikipediaEntry { genus: string; en: WikipediaSummary | null; es: WikipediaSummary | null }
export function fetchWikipedia(genus: string, fetchFn?: FetchFn): Promise<WikipediaEntry | null>;
export function formatForPrompt(data: WikipediaEntry | null): string | null;
