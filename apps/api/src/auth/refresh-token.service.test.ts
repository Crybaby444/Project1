import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from '../../test/support/db';
import { FakeClock } from '../../test/support/fake-clock';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

const DAY = 86_400_000;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const prisma = new PrismaService({ DATABASE_URL: process.env['DATABASE_URL']! });
let clock: FakeClock;
let refresh: RefreshTokenService;
let user: User;

beforeEach(async () => {
  await resetAccounts(prisma);
  clock = new FakeClock();
  refresh = new RefreshTokenService(prisma, clock);
  user = await prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Anna' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const unauthenticated = { code: 'AUTH_UNAUTHENTICATED', status: 401 };

describe('RefreshTokenService', () => {
  it('issues a random token, keeps only its SHA-256 and lets it live 30 days', async () => {
    const first = await refresh.issue(user.id, { userAgent: 'Firefox', ip: '203.0.113.7' });

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
    expect(first.expiresAt.getTime()).toBe(clock.now().getTime() + 30 * DAY);
    const row = await prisma.refreshToken.findFirst({ where: { tokenHash: sha256(first.token) } });
    expect(row).toMatchObject({ userId: user.id, userAgent: 'Firefox', ip: '203.0.113.7', revokedAt: null });
    expect(await prisma.refreshToken.count({ where: { tokenHash: first.token } })).toBe(0);
  });

  it('rotates a token into a new one of the same session family', async () => {
    const first = await refresh.issue(user.id, {});
    const second = await refresh.rotate(first.token, { ip: '198.51.100.1' });

    expect(second.userId).toBe(user.id);
    expect(second.token).not.toBe(first.token);
    const old = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(first.token) } });
    const next = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(second.token) } });
    expect(next.familyId).toBe(old.familyId);
    expect(old.replacedById).toBe(next.id);
    expect(old.revokedAt).not.toBeNull();
    expect(next).toMatchObject({ revokedAt: null, ip: '198.51.100.1' });
  });

  it('treats a rotated token used again as stolen and revokes the whole family', async () => {
    const first = await refresh.issue(user.id, {});
    const second = await refresh.rotate(first.token, {});

    await expect(refresh.rotate(first.token, {})).rejects.toMatchObject(unauthenticated);
    // The legitimate holder of the newest token is signed out too.
    await expect(refresh.rotate(second.token, {})).rejects.toMatchObject(unauthenticated);
    expect(await prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
  });

  it('rejects an expired token', async () => {
    const first = await refresh.issue(user.id, {});
    clock.advance(30 * DAY + 1);
    await expect(refresh.rotate(first.token, {})).rejects.toMatchObject(unauthenticated);
  });

  it('rejects a token it never issued', async () => {
    await expect(refresh.rotate('made-up-token', {})).rejects.toMatchObject(unauthenticated);
  });

  it('revokeFamily ends one session and leaves the user’s other sessions alive', async () => {
    const phone = await refresh.issue(user.id, {});
    const laptop = await refresh.issue(user.id, {});

    await refresh.revokeFamily(phone.token);

    await expect(refresh.rotate(phone.token, {})).rejects.toMatchObject(unauthenticated);
    await expect(refresh.rotate(laptop.token, {})).resolves.toMatchObject({ userId: user.id });
  });

  it('revokeAll ends every session of that user and nobody else’s', async () => {
    const other = await prisma.user.create({ data: { email: 'bob@mail.lv', name: 'Bob' } });
    const phone = await refresh.issue(user.id, {});
    const laptop = await refresh.issue(user.id, {});
    const bobs = await refresh.issue(other.id, {});

    await refresh.revokeAll(user.id);

    await expect(refresh.rotate(phone.token, {})).rejects.toMatchObject(unauthenticated);
    await expect(refresh.rotate(laptop.token, {})).rejects.toMatchObject(unauthenticated);
    await expect(refresh.rotate(bobs.token, {})).resolves.toMatchObject({ userId: other.id });
  });

  it('never forks a session into two live tokens when one token is rotated twice at once', async () => {
    const first = await refresh.issue(user.id, {});

    const results = await Promise.allSettled([refresh.rotate(first.token, {}), refresh.rotate(first.token, {})]);

    expect(results.filter((r) => r.status === 'fulfilled').length).toBeLessThanOrEqual(1);
    expect(await prisma.refreshToken.count({ where: { revokedAt: null } })).toBeLessThanOrEqual(1);
  });
});
