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

  it('leaves Google sign-in unconfigured by default and points at Google’s real endpoints', () => {
    expect(loadEnv({ ...valid, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: ' ' })).toMatchObject({
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      GOOGLE_AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
      GOOGLE_TOKEN_URL: 'https://oauth2.googleapis.com/token',
      GOOGLE_JWKS_URL: 'https://www.googleapis.com/oauth2/v3/certs',
    });
    expect(loadEnv({ ...valid, GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com' }).GOOGLE_CLIENT_ID).toBe(
      'id.apps.googleusercontent.com',
    );
  });

  it('simulates SMS by email outside production and has no SMS provider in production by default', () => {
    expect(loadEnv(valid).SMS_PROVIDER).toBe('mailbox');
    expect(loadEnv({ ...valid, NODE_ENV: 'test' }).SMS_PROVIDER).toBe('mailbox');
    expect(loadEnv({ ...valid, NODE_ENV: 'production' }).SMS_PROVIDER).toBeUndefined();
    expect(loadEnv({ ...valid, NODE_ENV: 'production', SMS_PROVIDER: '' }).SMS_PROVIDER).toBeUndefined();
  });

  it('never lets production "confirm" phones by email, and knows no other SMS provider yet', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'production', SMS_PROVIDER: 'mailbox' })).toThrow(/SMS_PROVIDER/);
    expect(() => loadEnv({ ...valid, SMS_PROVIDER: 'twilio' })).toThrow(/SMS_PROVIDER/);
  });

  it('reads the optional admin account, normalizing the email', () => {
    expect(loadEnv(valid).ADMIN_EMAIL).toBeUndefined();
    expect(loadEnv({ ...valid, ADMIN_PASSWORD: ' ' }).ADMIN_PASSWORD).toBeUndefined();
    expect(loadEnv({ ...valid, ADMIN_EMAIL: '  Admin@Yoyo.Rent ', ADMIN_PASSWORD: 'long enough secret' })).toMatchObject({
      ADMIN_EMAIL: 'admin@yoyo.rent',
      ADMIN_PASSWORD: 'long enough secret',
    });
  });

  it('rejects an admin password shorter than 8 characters without printing it', () => {
    expect(() => loadEnv({ ...valid, ADMIN_EMAIL: 'a@yoyo.rent', ADMIN_PASSWORD: 'hunter2' })).toThrow(
      expect.objectContaining({ message: expect.stringMatching(/ADMIN_PASSWORD/) }),
    );
    expect(() => loadEnv({ ...valid, ADMIN_EMAIL: 'a@yoyo.rent', ADMIN_PASSWORD: 'hunter2' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });

  it('rejects a negative or fractional TRUST_PROXY_HOPS', () => {
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: '-1' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: '1.5' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv({ ...valid, TRUST_PROXY_HOPS: 'two' })).toThrow(/TRUST_PROXY_HOPS/);
  });

  it('reads an optional PROXY_SECRET of at least 32 characters and never prints a rejected one', () => {
    expect(loadEnv(valid).PROXY_SECRET).toBeUndefined();
    expect(loadEnv({ ...valid, PROXY_SECRET: '' }).PROXY_SECRET).toBeUndefined();
    expect(loadEnv({ ...valid, PROXY_SECRET: 'p'.repeat(32) }).PROXY_SECRET).toBe('p'.repeat(32));
    expect(() => loadEnv({ ...valid, PROXY_SECRET: 'short-proxy-secret' })).toThrow(
      expect.objectContaining({ message: expect.stringMatching(/PROXY_SECRET/) }),
    );
    expect(() => loadEnv({ ...valid, PROXY_SECRET: 'short-proxy-secret' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('short-proxy-secret') }),
    );
  });

  it('caps registrations at 100 an hour by default, adjustable with REGISTRATION_HOURLY_CAP', () => {
    expect(loadEnv(valid).REGISTRATION_HOURLY_CAP).toBe(100);
    expect(loadEnv({ ...valid, REGISTRATION_HOURLY_CAP: '250' }).REGISTRATION_HOURLY_CAP).toBe(250);
    expect(() => loadEnv({ ...valid, REGISTRATION_HOURLY_CAP: '0' })).toThrow(/REGISTRATION_HOURLY_CAP/);
  });
});
