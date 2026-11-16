import { ageOn, MIN_AGE, RESERVED_USERNAMES, UsernameSchema } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import type { Prisma, PrismaClient } from '../generated/prisma/client';

type Db = Pick<PrismaClient | Prisma.TransactionClient, 'user'>;

/** `2008-11-16T…` → `2008-11-16`. */
export const dayOfDate = (date: Date): string => date.toISOString().slice(0, 10);

/** 400 UNDERAGE unless the birth date makes them 18 or older today (UTC). */
export function assertAdult(birthDate: string, now: Date): void {
  if (ageOn(birthDate, dayOfDate(now)) < MIN_AGE) {
    throw new AppError('UNDERAGE', 400, 'Yoyo is for people aged 18 and over', { birthDate: 'You must be 18 or older' });
  }
}

/** 409 USERNAME_TAKEN when someone else has it. */
export async function assertUsernameFree(db: Db, username: string, exceptUserId?: string): Promise<void> {
  const owner = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (owner && owner.id !== exceptUserId) throw new AppError('USERNAME_TAKEN', 409, 'This username is taken', { username: 'Taken' });
}

/** A free username made from an email or a name (Google sign-ups, accounts an administrator adds). */
export async function generateUsername(db: Db, from: string): Promise<string> {
  const base =
    from
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 14) || 'user';
  const start = base.length >= 3 && !RESERVED_USERNAMES.has(base) ? base : `${base}user`.slice(0, 14);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? start : `${start}${Math.floor(1000 + Math.random() * 9000)}`;
    if (!UsernameSchema.safeParse(candidate).success) continue;
    if (!(await db.user.findUnique({ where: { username: candidate }, select: { id: true } }))) return candidate;
  }
  return `user${Date.now().toString(36)}`;
}

/** 409 PROFILE_INCOMPLETE until the person has given a birth date (and has a username): renting and lending need them. */
/** Lending and renting need a checked identity (owner, 2026-11-16); staff never lend or rent. */
export async function assertIdentityVerified(db: Db, userId: string, required: boolean): Promise<void> {
  if (!required) return;
  const user = await db.user.findUnique({ where: { id: userId }, select: { identityVerifiedAt: true, role: true } });
  if (!user || user.role === 'ADMIN') return;
  if (user.identityVerifiedAt === null) throw new AppError('IDENTITY_REQUIRED', 409, 'Confirm who you are first');
}

export async function assertProfileComplete(db: Db, userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { birthDate: true, username: true, role: true } });
  if (!user || user.role === 'ADMIN') return;
  if (user.birthDate === null || user.username === null) {
    throw new AppError('PROFILE_INCOMPLETE', 409, undefined, undefined, { birthDate: user.birthDate !== null, username: user.username !== null });
  }
}
