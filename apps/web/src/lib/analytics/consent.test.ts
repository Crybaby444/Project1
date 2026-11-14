import { describe, expect, it } from 'vitest';
import { CONSENT_COOKIE, consentCookie, readConsent } from './consent';

describe('analytics consent', () => {
  it('reads the choice from the cookies, and nothing when there is none', () => {
    expect(readConsent('')).toBeNull();
    expect(readConsent(`a=1; ${CONSENT_COOKIE}=granted; b=2`)).toBe('granted');
    expect(readConsent(`${CONSENT_COOKIE}=denied`)).toBe('denied');
    expect(readConsent(`${CONSENT_COOKIE}=whatever`)).toBeNull();
  });

  it('remembers a choice for a year, and forgets it on request (to ask again)', () => {
    expect(consentCookie('granted')).toBe(`${CONSENT_COOKIE}=granted; path=/; max-age=31536000; samesite=lax`);
    expect(consentCookie(null)).toBe(`${CONSENT_COOKIE}=; path=/; max-age=0; samesite=lax`);
  });
});
