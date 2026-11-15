import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, newTotpSecret, openTotpSecret, sealTotpSecret, totpAt, totpUri, verifyTotp } from '../src/auth/totp';

// RFC 6238 appendix B: the ASCII key "12345678901234567890", SHA-1, last six of the eight digits.
const RFC_KEY = base32Encode(Buffer.from('12345678901234567890'));

describe('totp', () => {
  it('matches the RFC 6238 test vectors', () => {
    expect(totpAt(RFC_KEY, 59)).toBe('287082');
    expect(totpAt(RFC_KEY, 1111111109)).toBe('081804');
    expect(totpAt(RFC_KEY, 1234567890)).toBe('005924');
    expect(totpAt(RFC_KEY, 2000000000)).toBe('279037');
  });

  it('base32 round-trips and a new secret is 160 bits', () => {
    const s = newTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(s)).toHaveLength(20);
    expect(base32Decode(base32Encode(Buffer.from('hello')))).toEqual(Buffer.from('hello'));
  });

  it('accepts the code of this step and the neighbours, and says which step it was', () => {
    const now = 1_700_000_000;
    expect(verifyTotp(RFC_KEY, totpAt(RFC_KEY, now), now)).toBe(Math.floor(now / 30));
    expect(verifyTotp(RFC_KEY, totpAt(RFC_KEY, now - 30), now)).toBe(Math.floor(now / 30) - 1);
    expect(verifyTotp(RFC_KEY, totpAt(RFC_KEY, now + 30), now)).toBe(Math.floor(now / 30) + 1);
    expect(verifyTotp(RFC_KEY, totpAt(RFC_KEY, now - 90), now)).toBeNull();
    expect(verifyTotp(RFC_KEY, '12345', now)).toBeNull();
  });

  it('builds the otpauth link authenticator apps read', () => {
    expect(totpUri('ABC', 'ada@yoyo.rent')).toBe('otpauth://totp/Yoyo:ada%40yoyo.rent?secret=ABC&issuer=Yoyo&algorithm=SHA1&digits=6&period=30');
  });
});

describe('sealed secrets', () => {
  it('open with the same server key only', () => {
    const sealed = sealTotpSecret('ABCDEF', 'a'.repeat(32));
    expect(sealed).not.toContain('ABCDEF');
    expect(openTotpSecret(sealed, 'a'.repeat(32))).toBe('ABCDEF');
    expect(openTotpSecret(sealed, 'b'.repeat(32))).toBeNull();
    expect(openTotpSecret('junk', 'a'.repeat(32))).toBeNull();
  });
});
