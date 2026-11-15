import { z } from 'zod';

/** People must be adults to rent or lend (owner, 2026-11-16). */
export const MIN_AGE = 18;

/** Names nobody may take: they look official or collide with site paths. */
export const RESERVED_USERNAMES = new Set(['admin', 'administrator', 'yoyo', 'yoyorent', 'support', 'help', 'moderator', 'staff', 'root', 'system', 'settings', 'search', 'people', 'login', 'register', 'api']);

/**
 * A username (owner, 2026-11-16: people are found by it): 3–20 of a–z, 0–9, dot and underscore, starting
 * and ending with a letter or digit, no two dots in a row. Stored lowercase; unique.
 */
export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^@/, ''))
  .pipe(
    z
      .string()
      .min(3)
      .max(20)
      .refine((v) => /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(v) && !v.includes('..'), { params: { messageKey: 'username' } })
      .refine((v) => !RESERVED_USERNAMES.has(v), { params: { messageKey: 'usernameReserved' } }),
  );

/** A full name: first and last, at least two words. */
export const FullNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, { params: { messageKey: 'fullName' } });

/** YYYY-MM-DD of a real day from 1900 on. */
export const BirthDateSchema = z
  .string()
  .refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [y, m, d] = v.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, { params: { messageKey: 'birthDate' } });

/** Full years between a birth date and `today` (both YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export const UsernameCheckQuerySchema = z.object({ username: z.string().min(1).max(40) });
/** Whether a username is free, and if not why (TAKEN or INVALID). */
export const UsernameCheckSchema = z.object({ available: z.boolean(), reason: z.enum(['TAKEN', 'INVALID']).nullable() });
export type UsernameCheck = z.infer<typeof UsernameCheckSchema>;
