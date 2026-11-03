import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './api-url';

describe('resolveApiUrl', () => {
  it('uses the configured API origin', () => {
    expect(resolveApiUrl('https://yoyo-api.onrender.com', 'production')).toBe('https://yoyo-api.onrender.com');
  });

  it('falls back to the local API in development and tests', () => {
    expect(resolveApiUrl(undefined, 'development')).toBe('http://localhost:4000');
    expect(resolveApiUrl('', 'test')).toBe('http://localhost:4000');
  });

  it('refuses a production build without an API address instead of silently calling localhost', () => {
    expect(() => resolveApiUrl(undefined, 'production')).toThrow(/NEXT_PUBLIC_API_URL/);
    expect(() => resolveApiUrl('   ', 'production')).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
