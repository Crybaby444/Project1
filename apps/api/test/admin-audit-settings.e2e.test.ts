import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: audit log and platform settings', () => {
  let t: TestApp;
  let admin: Client;
  let owner: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    await t.prisma.$executeRawUnsafe('TRUNCATE TABLE "AdminAuditLog"');
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('records who did what to which object, newest first, filterable', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PENDING_REVIEW', title: 'Drill' });
    await admin.post(`/admin/listings/${listing.id}/approve`).send({ version: listing.version }).expect(200);
    await admin.post(`/admin/users/${owner.user.id}/block`).expect(200);
    await owner.get('/admin/audit').expect(403);
    const log = (await admin.get('/admin/audit').expect(200)).body;
    expect(log.total).toBe(2);
    expect(log.items[0]).toMatchObject({ action: 'USER_BLOCKED', targetType: 'USER', targetId: owner.user.id, admin: { name: 'Ada' } });
    expect(log.items[1]).toMatchObject({ action: 'LISTING_APPROVED', targetType: 'LISTING', targetId: listing.id, summary: 'Drill' });
    const only = (await admin.get('/admin/audit?action=LISTING_APPROVED').expect(200)).body;
    expect(only.items.map((e: { action: string }) => e.action)).toEqual(['LISTING_APPROVED']);
  });

  it('shows every setting with its default, changes them within the rules, and logs before and after', async () => {
    const all = (await admin.get('/admin/settings').expect(200)).body.items;
    expect(all.find((s: { key: string }) => s.key === 'review.windowDays')).toMatchObject({ value: 14, default: 14, changed: false });
    await admin.put('/admin/settings').send({ 'fees.servicePercent': 12, 'review.windowDays': 21 }).expect(200);
    await admin.put('/admin/settings').send({ 'booking.requestTtlHours': 0 }).expect(400);
    await admin.put('/admin/settings').send({ 'fees.promoServiceUntil': 'tomorrow' }).expect(400);
    const after = (await admin.get('/admin/settings').expect(200)).body.items;
    expect(after.find((s: { key: string }) => s.key === 'fees.servicePercent')).toMatchObject({ value: 12, changed: true });
    // The deal rules use the new value at once.
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const terms = (await owner.get(`/listings/${listing.id}/booking-terms`).expect(200)).body;
    expect(JSON.stringify(terms)).toContain('"servicePercent":12');
    const entry = (await admin.get('/admin/audit?action=SETTINGS_CHANGED').expect(200)).body.items[0];
    expect(entry.before).toMatchObject({ 'fees.servicePercent': 10, 'review.windowDays': 14 });
    expect(entry.after).toMatchObject({ 'fees.servicePercent': 12, 'review.windowDays': 21 });
  });
});
