import 'reflect-metadata';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { resetAccounts } from './support/db';

const prisma = new PrismaService({ DATABASE_URL: process.env['DATABASE_URL']! });

beforeEach(async () => {
  await resetAccounts(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const inOneHour = () => new Date(Date.now() + 3_600_000);

describe('account tables', () => {
  it('creates a user with the account defaults', async () => {
    const user = await prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Anna' } });
    expect(user).toMatchObject({
      email: 'anna@mail.lv',
      passwordHash: null,
      role: 'USER',
      locale: 'en',
      theme: 'system',
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      blockedAt: null,
      deletedAt: null,
    });
    expect(user.id).toEqual(expect.any(String));
  });

  it('refuses a second user with the same email (P2002)', async () => {
    await prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Anna' } });
    await expect(prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Other' } })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('stores emails in lowercase only, so the unique index cannot be bypassed by case', async () => {
    await expect(prisma.user.create({ data: { email: 'Anna@Mail.lv', name: 'Anna' } })).rejects.toThrow(
      /User_email_lowercase/,
    );
  });

  it('deletes everything that belongs to a user together with the user', async () => {
    const user = await prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Anna' } });
    await prisma.refreshToken.create({
      data: { userId: user.id, familyId: 'f1', tokenHash: 'h1', expiresAt: inOneHour() },
    });
    await prisma.emailToken.create({
      data: { userId: user.id, type: 'VERIFY_EMAIL', tokenHash: 'e1', expiresAt: inOneHour() },
    });
    await prisma.oAuthAccount.create({ data: { userId: user.id, provider: 'google', providerAccountId: 'g-1' } });
    await prisma.phoneCode.create({
      data: { userId: user.id, phone: '+37120000000', codeHash: 'c1', expiresAt: inOneHour() },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.refreshToken.count()).toBe(0);
    expect(await prisma.emailToken.count()).toBe(0);
    expect(await prisma.oAuthAccount.count()).toBe(0);
    expect(await prisma.phoneCode.count()).toBe(0);
  });

  it('links one provider account to at most one user', async () => {
    const anna = await prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Anna' } });
    const bob = await prisma.user.create({ data: { email: 'bob@mail.lv', name: 'Bob' } });
    await prisma.oAuthAccount.create({ data: { userId: anna.id, provider: 'google', providerAccountId: 'g-1' } });
    await expect(
      prisma.oAuthAccount.create({ data: { userId: bob.id, provider: 'google', providerAccountId: 'g-1' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('never stores the same token hash twice', async () => {
    const user = await prisma.user.create({ data: { email: 'anna@mail.lv', name: 'Anna' } });
    const token = { userId: user.id, familyId: 'f1', tokenHash: 'same', expiresAt: inOneHour() };
    await prisma.refreshToken.create({ data: token });
    await expect(prisma.refreshToken.create({ data: { ...token, familyId: 'f2' } })).rejects.toMatchObject({
      code: 'P2002',
    });
  });
});
