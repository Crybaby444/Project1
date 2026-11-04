import type { Env } from '../config/env';
import { Prisma, type PrismaClient } from '../generated/prisma/client';

export type AdminEnv = Partial<Pick<Env, 'ADMIN_EMAIL' | 'ADMIN_PASSWORD'>>;

/**
 * Makes ADMIN_EMAIL an administrator with a confirmed email, creating the account (password
 * ADMIN_PASSWORD) when it does not exist. An existing password is never overwritten. Does nothing
 * unless both variables are set. Safe to run on every start and from several instances at once.
 */
export async function ensureAdmin(
  prisma: PrismaClient,
  passwords: { hash(plain: string): Promise<string> },
  env: AdminEnv,
  now: Date,
): Promise<void> {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = env;
  if (!email || !password) return;

  const promote = async () => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) return false;
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'ADMIN',
        emailVerifiedAt: existing.emailVerifiedAt ?? now,
        // A Google-only account gets a password to sign in with; a real one is never replaced.
        ...(existing.passwordHash === null && { passwordHash: await passwords.hash(password) }),
      },
    });
    return true;
  };

  if (await promote()) return;
  try {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: await passwords.hash(password),
        emailVerifiedAt: now,
        createdAt: now,
      },
    });
  } catch (error) {
    // Another instance created it a moment ago: promoting it is all that is left to do.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    await promote();
  }
}
