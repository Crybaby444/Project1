import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://localhost:5432/yoyo_test',
  WEB_ORIGIN: 'http://localhost:3000',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('names every missing required variable in a single error', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({})).toThrow(/WEB_ORIGIN/);
    expect(() => loadEnv({})).toThrow(/JWT_SECRET/);
  });

  it('requires a JWT_SECRET of at least 32 characters', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'x'.repeat(31) })).toThrow(/JWT_SECRET/);
    expect(loadEnv({ ...valid, JWT_SECRET: 'y'.repeat(32) }).JWT_SECRET).toBe('y'.repeat(32));
  });

  it('never prints the JWT_SECRET it rejects', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'short-secret-value' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('short-secret-value') }),
    );
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

  it('sends mail to the local Mailpit in development and test, and nowhere in production unless configured', () => {
    expect(loadEnv(valid).SMTP_URL).toBe('smtp://localhost:1025');
    expect(loadEnv({ ...valid, NODE_ENV: 'test' }).SMTP_URL).toBe('smtp://localhost:1025');
    expect(loadEnv({ ...valid, NODE_ENV: 'production' }).SMTP_URL).toBeUndefined();
    expect(loadEnv({ ...valid, NODE_ENV: 'production', SMTP_URL: '' }).SMTP_URL).toBeUndefined();
    expect(
      loadEnv({ ...valid, NODE_ENV: 'production', SMTP_URL: 'smtps://me%40gmail.com:app-pass@smtp.gmail.com:465' })
        .SMTP_URL,
    ).toBe('smtps://me%40gmail.com:app-pass@smtp.gmail.com:465');
  });

  it('accepts only smtp:// or smtps:// mail servers and never echoes the URL with its password', () => {
    expect(() => loadEnv({ ...valid, SMTP_URL: 'https://user:hunter2@mail.example' })).toThrow(/SMTP_URL/);
    expect(() => loadEnv({ ...valid, SMTP_URL: 'https://user:hunter2@mail.example' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });

  it('has a default sender address', () => {
    expect(loadEnv(valid).MAIL_FROM).toBe('Yoyo <no-reply@yoyo.local>');
    expect(loadEnv({ ...valid, MAIL_FROM: 'Yoyo <me@gmail.com>' }).MAIL_FROM).toBe('Yoyo <me@gmail.com>');
  });

  it('rejects a negative or fractional TRUST_PROXY_HOPS', () => {
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: '-1' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: '1.5' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: 'two' })).toThrow(/TRUST_PROXY_HOPS/);
  });
});
