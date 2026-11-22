export interface FractaeInfo { name: string; latin: string; color: string; opposite: string }
export const FRACTAE: Record<string, FractaeInfo>;
export function resolveFractae(input: string): FractaeInfo;
export function buildPrompt(especie: string, fractae: FractaeInfo, realData: string | null): string;
export function parseModelJson(text: string): Record<string, unknown>;
