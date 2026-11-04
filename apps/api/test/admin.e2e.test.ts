import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSeed } from '../prisma/seed';
import { PasswordService } from '../src/auth/password.service';
import { resetAccounts } from './support/db';
import { cookieValue, createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

describe('admin: users list behind the ADMIN role', () => {
  let t: TestApp;

  async function signedInAs(role: 'USER' | 'ADMIN') {
    const { user, email, password } = await seedUser(t, { role, name: role === 'ADMIN' ? 'Admin' : 'Someone' });
    const agent = request.agent(t.server);
    await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
    return { user, agent };
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.clock.advance(61 * 60_000);
  });

  afterAll(async () => {
    await t.close();
  });

  it('answers 401 without a session and 403 AUTH_FORBIDDEN to a regular user', async () => {
    expect((await request(t.server).get('/api/v1/admin/users')).status).toBe(401);
    const { agent } = await signedInAs('USER');
    const res = await agent.get('/api/v1/admin/users');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('lists users for an admin, newest first, 20 a page, with the total', async () => {
    const { agent } = await signedInAs('ADMIN');
    for (let i = 1; i <= 24; i++) {
      t.clock.advance(1000);
      await seedUser(t, { email: `user${String(i).padStart(2, '0')}@mail.lv`, name: `User ${i}` });
    }

    const first = await agent.get('/api/v1/admin/users');
    const second = await agent.get('/api/v1/admin/users?page=2');

    expect(first.status).toBe(200);
    expect(first.body.total).toBe(25);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.items[0].email).toBe('user24@mail.lv');
    expect(second.body.items).toHaveLength(5);
    expect(first.body.items[0]).toMatchObject({ blockedAt: null, deletedAt: null, role: 'USER' });
    expect(JSON.stringify(first.body)).not.toContain('passwordHash');
  });

  it('searches by email and by name, ignoring case', async () => {
    const { agent } = await signedInAs('ADMIN');
    await seedUser(t, { email: 'anna@mail.lv', name: 'Anna Bērziņa' });
    await seedUser(t, { email: 'boris@post.lv', name: 'Boris' });

    const byEmail = await agent.get('/api/v1/admin/users?search=ANNA@');
    const byName = await agent.get('/api/v1/admin/users?search=bOrI');
    const bySite = await agent.get('/api/v1/admin/users?search=post.lv');

    expect(byEmail.body.items.map((u: { email: string }) => u.email)).toEqual(['anna@mail.lv']);
    expect(byName.body.items.map((u: { name: string }) => u.name)).toEqual(['Boris']);
    expect(bySite.body.total).toBe(1);
  });

  it('shows when an account was blocked or deleted', async () => {
    const { agent } = await signedInAs('ADMIN');
    const { user } = await seedUser(t, { email: 'blocked@mail.lv' });
    await t.prisma.user.update({ where: { id: user.id }, data: { blockedAt: t.clock.now(), deletedAt: t.clock.now() } });

    const res = await agent.get('/api/v1/admin/users?search=blocked');

    expect(res.body.items[0]).toMatchObject({ blockedAt: t.clock.now().toISOString(), deletedAt: t.clock.now().toISOString() });
  });

  it('applies a role change at once, not when the access token runs out', async () => {
    const { agent, user } = await signedInAs('ADMIN');
    expect((await agent.get('/api/v1/admin/users')).status).toBe(200);

    await t.prisma.user.update({ where: { id: user.id }, data: { role: 'USER' } });

    expect((await agent.get('/api/v1/admin/users')).status).toBe(403);
  });

  it('seeds one admin however often the seed runs, and keeps an existing password', async () => {
    const passwords = t.app.get(PasswordService);
    await runSeed(t.prisma, { passwords, env: { ADMIN_EMAIL: 'admin@yoyo.test', ADMIN_PASSWORD: 'first admin password' } });
    await runSeed(t.prisma, { passwords, env: { ADMIN_EMAIL: 'admin@yoyo.test', ADMIN_PASSWORD: 'second admin password' } });

    expect(await t.prisma.user.count({ where: { role: 'ADMIN' } })).toBe(1);
    const login = (password: string) => request(t.server).post('/api/v1/auth/login').send({ email: 'admin@yoyo.test', password });
    expect((await login('first admin password')).status).toBe(200);
    expect((await login('second admin password')).status).toBe(401);
  });
});

describe('the admin account from ADMIN_EMAIL / ADMIN_PASSWORD at API start', () => {
  const env = { ADMIN_EMAIL: '  Admin@Yoyo.Test ', ADMIN_PASSWORD: 'admin password 1' };

  it('exists once, confirmed, after two starts, and can sign in', async () => {
    const setup = await createTestApp(); // no admin variables: nothing is created on this start
    await resetAccounts(setup.prisma);
    await setup.close();

    await (await createTestApp({ env })).close(); // first start creates the admin
    const t = await createTestApp({ env }); // second start finds it
    try {
      const admins = await t.prisma.user.findMany({ where: { role: 'ADMIN' } });
      expect(admins).toHaveLength(1);
      expect(admins[0]).toMatchObject({ email: 'admin@yoyo.test' });
      expect(admins[0]!.emailVerifiedAt).not.toBeNull();
      const login = await request(t.server)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@yoyo.test', password: 'admin password 1' });
      expect(login.status).toBe(200);
      expect(login.body.user.role).toBe('ADMIN');
    } finally {
      await t.close();
    }
  });

  it('takes over an unconfirmed account squatting ADMIN_EMAIL: its password, sessions and links die', async () => {
    const setup = await createTestApp();
    await resetAccounts(setup.prisma);
    const { user: squatter } = await seedUser(setup, { email: 'admin@yoyo.test', password: 'squatter password' });
    const login = await request(setup.server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@yoyo.test', password: 'squatter password' })
      .expect(200);
    const squatterRefresh = cookieValue(login.headers['set-cookie'], 'yoyo_rt')!;
    const now = setup.clock.now();
    await setup.prisma.oAuthAccount.create({
      data: { userId: squatter.id, provider: 'google', providerAccountId: 'squatter-sub', createdAt: now },
    });
    await setup.prisma.emailToken.create({
      data: { userId: squatter.id, type: 'RESET_PASSWORD', tokenHash: 'squatter-link', expiresAt: new Date(now.getTime() + 3_600_000) },
    });
    await setup.prisma.phoneCode.create({
      data: { userId: squatter.id, phone: '+37120000000', codeHash: 'x', expiresAt: new Date(now.getTime() + 600_000) },
    });
    await setup.close();

    const warn = vi.spyOn(Logger.prototype, 'warn');
    const t = await createTestApp({ env });
    try {
      const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'admin@yoyo.test' } });
      expect(user.role).toBe('ADMIN');
      expect(user.emailVerifiedAt).not.toBeNull();
      const signIn = (password: string) => request(t.server).post('/api/v1/auth/login').send({ email: 'admin@yoyo.test', password });
      expect((await signIn('squatter password')).status).toBe(401);
      expect((await signIn('admin password 1')).status).toBe(200);
      const refresh = await request(t.server).post('/api/v1/auth/refresh').send({ refreshToken: squatterRefresh });
      expect(refresh.status).toBe(401);
      expect(await t.prisma.oAuthAccount.count({ where: { userId: user.id } })).toBe(0);
      expect(await t.prisma.emailToken.count({ where: { userId: user.id } })).toBe(0);
      expect(await t.prisma.phoneCode.count({ where: { userId: user.id } })).toBe(0);
      const warnings = warn.mock.calls.map((call) => String(call[0]));
      expect(warnings.some((line) => line.includes('a***@yoyo.test'))).toBe(true);
      expect(warnings.join('\n')).not.toContain('admin@yoyo.test');
    } finally {
      warn.mockRestore();
      await t.close();
    }
  });

  it('promotes a confirmed account with that email and keeps its password and sessions', async () => {
    const setup = await createTestApp();
    await resetAccounts(setup.prisma);
    await seedUser(setup, { email: 'admin@yoyo.test', password: 'my own password', emailVerified: true });
    const login = await request(setup.server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@yoyo.test', password: 'my own password' })
      .expect(200);
    const ownRefresh = cookieValue(login.headers['set-cookie'], 'yoyo_rt')!;
    await setup.close();

    const t = await createTestApp({ env });
    try {
      const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'admin@yoyo.test' } });
      expect(user.role).toBe('ADMIN');
      const signIn = (password: string) => request(t.server).post('/api/v1/auth/login').send({ email: 'admin@yoyo.test', password });
      expect((await signIn('my own password')).status).toBe(200);
      expect((await signIn('admin password 1')).status).toBe(401);
      expect((await request(t.server).post('/api/v1/auth/refresh').send({ refreshToken: ownRefresh })).status).toBe(200);
    } finally {
      await t.close();
    }
  });

  it('starts normally and creates no admin when only one of the two is set', async () => {
    const t = await createTestApp({ env: { ADMIN_EMAIL: 'admin@yoyo.test' } });
    try {
      await resetAccounts(t.prisma);
      expect((await request(t.server).get('/api/v1/health')).status).toBe(200);
      expect(await t.prisma.user.count({ where: { role: 'ADMIN' } })).toBe(0);
    } finally {
      await t.close();
    }
  });
});
