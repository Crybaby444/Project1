import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('routing', () => {
  it('serves every URL in its own language: no redirect from Accept-Language or a cookie', () => {
    expect(routing.localeDetection).toBe(false);
    // The proxy never writes NEXT_LOCALE on a plain visit; only a visitor's choice does.
    expect(routing.localeCookie).toBe(false);
    expect(routing.localePrefix).toBe('as-needed');
  });
});
