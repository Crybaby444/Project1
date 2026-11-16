import { describe, expect, it } from 'vitest';
import { openPhoto, photoKey, sealPhoto } from './photo-crypto';

describe('identity photo encryption', () => {
  const key = photoKey(undefined, 'test-only-jwt-secret-0123456789abcdef');

  it('round-trips, with a new IV each time', () => {
    const plain = Buffer.from('a passport photo');
    const a = sealPhoto(key, plain);
    expect(openPhoto(key, a).toString()).toBe('a passport photo');
    expect(sealPhoto(key, plain).equals(a)).toBe(false);
  });

  it('refuses a tampered photo or the wrong key', () => {
    const sealed = sealPhoto(key, Buffer.from('x'.repeat(40)));
    sealed.writeUInt8(sealed.readUInt8(sealed.length - 1) ^ 1, sealed.length - 1);
    expect(() => openPhoto(key, sealed)).toThrow();
    expect(() => openPhoto(photoKey('00'.repeat(32), ''), sealPhoto(key, Buffer.from('y')))).toThrow();
  });
});
