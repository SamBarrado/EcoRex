import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from './origin';

describe('isAllowedOrigin', () => {
  it('allows no Origin header', () => {
    expect(isAllowedOrigin(null)).toBe(true);
  });

  it('allows the production origin', () => {
    expect(isAllowedOrigin('https://dino-discovery-generator.pages.dev')).toBe(true);
  });

  it('allows preview-deployment subdomains', () => {
    expect(isAllowedOrigin('https://abc123.dino-discovery-generator.pages.dev')).toBe(true);
  });

  it('rejects an unrelated origin', () => {
    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
  });

  it('rejects a non-https origin', () => {
    expect(isAllowedOrigin('http://dino-discovery-generator.pages.dev')).toBe(false);
  });

  it('rejects a malformed origin', () => {
    expect(isAllowedOrigin('not-a-url')).toBe(false);
  });
});
