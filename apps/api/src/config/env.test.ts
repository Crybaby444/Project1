import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://localhost:5432/yoyo_test',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('loadEnv', () => {
  it('names every missing required variable in a single error', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({})).toThrow(/WEB_ORIGIN/);
  });

  it('applies defaults for optional variables', () => {
    expect(loadEnv(valid)).toMatchObject({ PORT: 4000, NODE_ENV: 'development' });
  });

  it('coerces PORT from a string and rejects junk', () => {
    expect(loadEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects a WEB_ORIGIN that is not a URL', () => {
    expect(() => loadEnv({ ...valid, WEB_ORIGIN: 'localhost' })).toThrow(/WEB_ORIGIN/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
