import { describe, expect, it } from 'vitest';
import { afterSignIn, safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps a path on this site, with its query', () => {
    expect(safeNext('/settings')).toBe('/settings');
    expect(safeNext('/settings/security?tab=1')).toBe('/settings/security?tab=1');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '',
    'settings',
    '/\tevil',
  ])('never leaves the site: %j becomes /', (bad) => {
    expect(safeNext(bad)).toBe('/');
  });

  it('treats a missing value as /', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
  });
});

describe('afterSignIn', () => {
  it('opens the admin panel for an administrator with nowhere else to go', () => {
    expect(afterSignIn('ADMIN', null)).toBe('/admin');
    expect(afterSignIn('ADMIN', '/')).toBe('/admin');
    expect(afterSignIn('ADMIN', '/bookings/b1')).toBe('/bookings/b1');
    expect(afterSignIn('USER', null)).toBe('/');
    expect(afterSignIn('USER', 'https://evil.example')).toBe('/');
  });
});
