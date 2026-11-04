import type { Env } from '../config/env';
import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { maskEmail } from '../mail/mail.provider';

export type AdminEnv = Partial<Pick<Env, 'ADMIN_EMAIL' | 'ADMIN_PASSWORD'>>;

/**
 * Makes ADMIN_EMAIL an administrator with a confirmed email, creating the account (password
 * ADMIN_PASSWORD) when it does not exist. Does nothing unless both variables are set. Safe to run on
 * every start and from several instances at once.
 *
 * - A **confirmed** account keeps its password and sessions; it only becomes ADMIN.
 * - An **unconfirmed** account never proved it owns the mailbox: anyone could have registered the
 *   future admin email first. It is taken over: password ADMIN_PASSWORD, email confirmed, and every
 *   session, Google link, email link and phone code of the squatter is deleted.
 */
export async function ensureAdmin(
  prisma: PrismaClient,
  passwords: { hash(plain: string): Promise<string> },
  env: AdminEnv,
  now: Date,
  logger: { warn(message: string): void } = console,
): Promise<void> {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = env;
  if (!email || !password) return;

  const promote = async () => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) return false;
    if (existing.emailVerifiedAt !== null) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          // A Google-only account gets a password to sign in with; a real one is never replaced.
          ...(existing.passwordHash === null && { passwordHash: await passwords.hash(password) }),
        },
      });
      return true;
    }
    const passwordHash = await passwords.hash(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN', emailVerifiedAt: now, passwordHash },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: existing.id } }),
      prisma.oAuthAccount.deleteMany({ where: { userId: existing.id } }),
      prisma.emailToken.deleteMany({ where: { userId: existing.id } }),
      prisma.phoneCode.deleteMany({ where: { userId: existing.id } }),
    ]);
    logger.warn(
      `took over the unconfirmed account ${maskEmail(email)} for ADMIN_EMAIL: its password, sessions and links were replaced`,
    );
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
