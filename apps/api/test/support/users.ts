import { randomUUID } from 'node:crypto';
import { PasswordService } from '../../src/auth/password.service';
import type { Role, StaffRole, User } from '../../src/generated/prisma/client';
import type { TestApp } from './test-app';

export interface SeedUser {
  email?: string;
  /** `null` creates an account without a password (Google only). */
  password?: string | null;
  name?: string;
  locale?: string;
  role?: Role;
  staffRole?: StaffRole;
  emailVerified?: boolean;
  /** null: an account from before usernames and birth dates were asked (or a Google sign-up). */
  username?: string | null;
  birthDate?: string | null;
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
      username: seed.username === undefined ? `u${randomUUID().replace(/-/g, '').slice(0, 12)}` : seed.username,
      birthDate: seed.birthDate === null ? null : new Date(`${seed.birthDate ?? '1990-01-01'}T00:00:00Z`),
      staffRole: seed.staffRole ?? null,
      passwordHash: password === null ? null : await t.app.get(PasswordService).hash(password),
      emailVerifiedAt: seed.emailVerified ? t.clock.now() : null,
      createdAt: t.clock.now(),
    },
  });
  return { user, email, password: password ?? '' };
}

/**
 * A registration body with what sign-up asks since 2026-11-16: a full name, a username (from the email)
 * and an adult's birth date — unless the test sets them itself.
 */
export function withIdentity<T extends { email?: string; name?: string }>(body: T): T & { username: string; birthDate: string } {
  const local = (body.email ?? 'user').trim().toLowerCase().split('@')[0]!.replace(/[^a-z0-9]/g, '') || 'user';
  const name = body.name && body.name.trim().split(/\s+/).length < 2 && body.name.trim() !== '' ? `${body.name.trim()} Tester` : body.name;
  return { username: `${local}x`.slice(0, 20), birthDate: '1990-01-01', ...body, name } as T & { username: string; birthDate: string };
}
