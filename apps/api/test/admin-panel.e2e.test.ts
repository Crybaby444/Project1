import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { paidDeal, requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin panel: overview and blocking accounts', () => {
  let t: TestApp;
  let admin: Client;
  let owner: Client;
  let renter: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { name: 'Ada Admin', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga Owner' });
    renter = await signedInClient(t, { name: 'Rita Renter' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('is for administrators only', async () => {
    await owner.get('/admin/overview').expect(403);
    await owner.post(`/admin/users/${renter.user.id}/block`).expect(403);
  });

  it('counts what needs attention and shows the newest activity', async () => {
    await seedListing(t, owner.user, { status: 'PENDING_REVIEW', title: 'Tent for four' });
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Cordless drill' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await step(owner, booking.id, { type: 'DECLINE' });
    await paidDeal(t, owner, renter);

    const body = (await admin.get('/admin/overview').expect(200)).body;
    expect(body.users).toMatchObject({ total: 3, new7d: 3, blocked: 0 });
    expect(body.listings).toMatchObject({ pendingReview: 1, published: 2 });
    expect(body.deals).toMatchObject({ open: 1, disputed: 0, requested: 0 });
    expect(body.ledgerOk).toBe(true);
    expect(body.series).toHaveLength(14);
    expect(body.series.at(-1)).toMatchObject({ users: 3, deals: 2 });
    const kinds = body.activity.map((a: { kind: string }) => a.kind);
    expect(kinds).toContain('USER_JOINED');
    expect(kinds).toContain('LISTING_SUBMITTED');
    expect(kinds).toContain('DEAL_REQUESTED');
    expect(body.activity.find((a: { kind: string }) => a.kind === 'LISTING_SUBMITTED').title).toBe('Tent for four');
  });

  it('blocks an account at once, ends its sessions, and unblocks it', async () => {
    const blocked = (await admin.post(`/admin/users/${renter.user.id}/block`).expect(200)).body.user;
    expect(blocked.blockedAt).not.toBeNull();
    const denied = await renter.get('/me');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('AUTH_BLOCKED');
    expect(await t.prisma.refreshToken.count({ where: { userId: renter.user.id, revokedAt: null } })).toBe(0);

    const unblocked = (await admin.post(`/admin/users/${renter.user.id}/unblock`).expect(200)).body.user;
    expect(unblocked.blockedAt).toBeNull();
  });

  it('never blocks an administrator or oneself', async () => {
    const other = await signedInClient(t, { role: 'ADMIN' });
    await admin.post(`/admin/users/${other.user.id}/block`).expect(409);
    await admin.post(`/admin/users/${admin.user.id}/block`).expect(409);
    await admin.post('/admin/users/nobody/block').expect(404);
  });
});
