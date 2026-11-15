import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Two-step sign-in codes (TOTP, RFC 6238: HMAC-SHA1, 30-second steps, 6 digits) as Google Authenticator,
 * 1Password, Authy and the like make them. No library: the algorithm is twenty lines and checked against
 * the RFC's test vectors (test/totp.test.ts).
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of text.replace(/=+$/, '').toUpperCase()) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('Not base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new 160-bit secret, base32 (what the person types into the app if they can't scan the code). */
export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function codeForStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1]! & 0xf;
  const n = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, '0');
}

/** The code at a moment (unix seconds). */
export function totpAt(secret: string, unixSeconds: number): string {
  return codeForStep(secret, Math.floor(unixSeconds / STEP));
}

/**
 * The step the code belongs to (this one or a neighbour, for a phone clock a little off), or null.
 * The caller refuses a step it already accepted, so a code works once.
 */
export function verifyTotp(secret: string, code: string, unixSeconds: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(unixSeconds / STEP);
  for (const step of [now, now - 1, now + 1]) {
    if (timingSafeEqual(Buffer.from(codeForStep(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}

/** The otpauth:// link a QR code carries. */
export function totpUri(secret: string, email: string): string {
  return `otpauth://totp/Yoyo:${encodeURIComponent(email)}?secret=${secret}&issuer=Yoyo&algorithm=SHA1&digits=6&period=30`;
}

/**
 * The secret is kept encrypted (AES-256-GCM) with a key derived from JWT_SECRET, so a copy of the
 * database alone does not give the codes. Changing JWT_SECRET turns two-step sign-in off for everyone
 * (they set it up again); the owner can also reset it for one person.
 */
function key(serverSecret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', serverSecret, 'yoyo', 'totp-secret-v1', 32));
}

export function sealTotpSecret(secret: string, serverSecret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(serverSecret), iv);
  const body = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

/** The secret, or null when it can't be opened (another server key). */
export function openTotpSecret(sealed: string, serverSecret: string): string | null {
  const [v, iv, tag, body] = sealed.split('.');
  if (v !== 'v1' || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(serverSecret), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
