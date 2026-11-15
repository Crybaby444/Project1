import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: system health and CSV exports', () => {
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
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga, "the owner"' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('says whether everything runs and how close to the limits', async () => {
    await owner.get('/admin/system').expect(403);
    const s = (await admin.get('/admin/system').expect(200)).body;
    expect(s.database.ok).toBe(true);
    expect(s.mail.limit).toBeGreaterThan(0);
    expect(s.overdueTimers).toBe(0);
    expect(s.counts.users).toBe(2);
  });

  it('exports people, items, deals and the ledger as CSV, quoting what needs it', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Drill' });
    const renter = await signedInClient(t, { name: 'Rita' });
    await requestBooking(t, renter, listing.id, 1, 3);
    const users = await admin.get('/admin/export/users.csv').expect(200);
    expect(users.headers['content-type']).toMatch(/text\/csv/);
    expect(users.headers['content-disposition']).toMatch(/attachment; filename="yoyo-users-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(users.text.split('\n')[0]).toBe('id,name,email,role,status,email_verified,created_at');
    expect(users.text).toContain('"Olga, ""the owner"""');
    const deals = await admin.get('/admin/export/deals.csv').expect(200);
    expect(deals.text).toContain('REQUESTED');
    await admin.get('/admin/export/listings.csv').expect(200);
    await admin.get('/admin/export/ledger.csv').expect(200);
    await admin.get('/admin/export/secrets.csv').expect(404);
    await owner.get('/admin/export/users.csv').expect(403);
  });
});
