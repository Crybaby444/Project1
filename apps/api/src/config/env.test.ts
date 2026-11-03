import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('lists every invalid key at once', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({})).toThrow(/WEB_ORIGIN/);
  });

  it('applies defaults', () => {
    expect(
      loadEnv({ DATABASE_URL: 'postgresql://localhost:5432/yoyo_test', WEB_ORIGIN: 'http://localhost:3000' }),
    ).toMatchObject({ PORT: 4000, NODE_ENV: 'development' });
  });

  it('rejects a non-numeric port', () => {
    expect(() =>
      loadEnv({ DATABASE_URL: 'postgresql://x', WEB_ORIGIN: 'http://localhost:3000', PORT: 'abc' }),
    ).toThrow(/PORT/);
  });
});
