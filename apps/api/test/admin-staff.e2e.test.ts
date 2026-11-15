import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: staff roles', () => {
  let t: TestApp;
  let owner: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await t.prisma.$executeRawUnsafe('TRUNCATE "AdminAuditLog"');
    await resetAccounts(t.prisma);
    owner = await signedInClient(t, { name: 'Ada', role: 'ADMIN', staffRole: 'OWNER' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('an administrator from before staff roles counts as the owner', async () => {
    const legacy = await signedInClient(t, { name: 'Old', role: 'ADMIN' });
    expect((await legacy.get('/me').expect(200)).body.user.staffRole).toBe('OWNER');
    await legacy.get('/admin/staff').expect(200);
    const user = await signedInClient(t, { name: 'Ivo' });
    expect((await user.get('/me').expect(200)).body.user.staffRole).toBeNull();
  });

  it('each role opens only its part of the panel', async () => {
    const mod = await signedInClient(t, { role: 'ADMIN', staffRole: 'MODERATOR' });
    await mod.get('/admin/listings').expect(200);
    await mod.get('/admin/reports').expect(200);
    await mod.get('/admin/ledger/summary').expect(403);
    await mod.get('/admin/settings').expect(403);
    await mod.get('/admin/staff').expect(403);
    await mod.get('/admin/overview').expect(200);

    const finance = await signedInClient(t, { role: 'ADMIN', staffRole: 'FINANCE' });
    await finance.get('/admin/ledger/summary').expect(200);
    await finance.get('/admin/system').expect(200);
    await finance.get('/admin/reports').expect(403);
    await finance.get('/admin/audit').expect(403);

    const editor = await signedInClient(t, { role: 'ADMIN', staffRole: 'EDITOR' });
    await editor.get('/admin/analytics').expect(200);
    await editor.get('/admin/categories').expect(200);
    await editor.get('/admin/bookings').expect(403);

    const support = await signedInClient(t, { role: 'ADMIN', staffRole: 'SUPPORT' });
    await support.get('/admin/bookings').expect(200);
    await support.get('/admin/ledger/summary').expect(403);
  });

  it('the owner lists staff, gives and takes roles, and every change is logged', async () => {
    const ivo = await signedInClient(t, { name: 'Ivo' });
    await owner.put(`/admin/users/${ivo.user.id}/staff`).send({ staffRole: 'SUPPORT' }).expect(200);
    const list = (await owner.get('/admin/staff').expect(200)).body.items;
    expect(list.map((s: { name: string; staffRole: string }) => [s.name, s.staffRole])).toEqual([
      ['Ada', 'OWNER'],
      ['Ivo', 'SUPPORT'],
    ]);
    expect((await ivo.get('/me').expect(200)).body.user).toMatchObject({ role: 'ADMIN', staffRole: 'SUPPORT' });

    await owner.put(`/admin/users/${ivo.user.id}/staff`).send({ staffRole: null }).expect(200);
    expect((await ivo.get('/me').expect(200)).body.user).toMatchObject({ role: 'USER', staffRole: null });
    await ivo.get('/admin/bookings').expect(403);

    const log = (await owner.get('/admin/audit?action=STAFF_CHANGED').expect(200)).body;
    expect(log.total).toBe(2);
  });

  it('nobody changes their own role, the last owner stays, and only the owner manages staff', async () => {
    await owner.put(`/admin/users/${owner.user.id}/staff`).send({ staffRole: 'EDITOR' }).expect(409);
    const second = await signedInClient(t, { role: 'ADMIN', staffRole: 'OWNER' });
    await second.put(`/admin/users/${owner.user.id}/staff`).send({ staffRole: 'EDITOR' }).expect(200);
    // Now `second` is the last owner; Ada (an editor) cannot touch staff at all.
    await owner.put(`/admin/users/${second.user.id}/staff`).send({ staffRole: 'EDITOR' }).expect(403);
    await owner.put(`/admin/users/${second.user.id}/staff`).send({ staffRole: 'NINJA' }).expect(403);
    const ghost = await signedInClient(t, { name: 'X' });
    await second.put(`/admin/users/${ghost.user.id}/staff`).send({ staffRole: 'NINJA' }).expect(400);
    await second.put('/admin/users/nope/staff').send({ staffRole: 'EDITOR' }).expect(404);
  });
});
