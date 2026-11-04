import { randomUUID } from 'node:crypto';
import { PasswordService } from '../../src/auth/password.service';
import type { Role, User } from '../../src/generated/prisma/client';
import type { TestApp } from './test-app';

export interface SeedUser {
  email?: string;
  /** `null` creates an account without a password (Google only). */
  password?: string | null;
  name?: string;
  locale?: string;
  role?: Role;
  emailVerified?: boolean;
}

/** Puts a user straight into the database (no HTTP, so no registration limit or email). */
export async function seedUser(
  t: TestApp,
  seed: SeedUser = {},
): Promise<{ user: User; email: string; password: string }> {
  const email = seed.email ?? `user-${randomUUID()}@mail.lv`;
  const password = seed.password === undefined ? 'correct horse' : seed.password;
  const user = await t.prisma.user.create({
    data: {
      email,
      name: seed.name ?? 'Anna',
      locale: seed.locale ?? 'en',
      role: seed.role ?? 'USER',
      passwordHash: password === null ? null : await t.app.get(PasswordService).hash(password),
      emailVerifiedAt: seed.emailVerified ? t.clock.now() : null,
    },
  });
  return { user, email, password: password ?? '' };
}
