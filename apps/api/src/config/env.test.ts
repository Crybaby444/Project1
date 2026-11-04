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
    expect(loadEnv(valid)).toMatchObject({ PORT: 4000, NODE_ENV: 'development', DB_CONNECT_TIMEOUT_MS: 5000 });
  });

  it('normalizes WEB_ORIGIN to a bare origin, so a trailing slash cannot break CORS', () => {
    expect(loadEnv({ ...valid, WEB_ORIGIN: 'https://yoyo.vercel.app/' }).WEB_ORIGIN).toBe('https://yoyo.vercel.app');
    expect(loadEnv({ ...valid, WEB_ORIGIN: 'https://yoyo.vercel.app/some/path' }).WEB_ORIGIN).toBe(
      'https://yoyo.vercel.app',
    );
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

  it('trusts no proxy by default and reads the number of proxy hops in front of the API', () => {
    expect(loadEnv(valid).TRUST_PROXY_HOPS).toBe(0);
    expect(loadEnv({ ...valid, TRUST_PROXY_HOPS: '2' }).TRUST_PROXY_HOPS).toBe(2);
    expect(loadEnv({ ...valid, TRUST_PROXY_HOPS: '' }).TRUST_PROXY_HOPS).toBe(0);
  });

  it('rejects a negative or fractional TRUST_PROXY_HOPS', () => {
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: '-1' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: '1.5' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: 'two' })).toThrow(/TRUST_PROXY_HOPS/);
  });
});
