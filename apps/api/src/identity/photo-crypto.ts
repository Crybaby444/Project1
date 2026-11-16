import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Identity photos at rest: AES-256-GCM, a fresh 12-byte IV each, stored as iv | tag | ciphertext. The key is
 * IDENTITY_PHOTO_KEY, or one derived from JWT_SECRET (HKDF) so a deployment works without a new secret.
 */
export function photoKey(explicitHex: string | undefined, jwtSecret: string): Buffer {
  if (explicitHex) return Buffer.from(explicitHex, 'hex');
  return Buffer.from(hkdfSync('sha256', jwtSecret, 'yoyo', 'yoyo:identity-photos', 32));
}

export function sealPhoto(key: Buffer, plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

export function openPhoto(key: Buffer, sealed: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12));
  decipher.setAuthTag(sealed.subarray(12, 28));
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
}
