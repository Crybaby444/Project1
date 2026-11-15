import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

describe('first-party traffic and SEO for the admin panel', () => {
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
    await t.prisma.$executeRawUnsafe('TRUNCATE TABLE "AnalyticsCounter"');
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga' });
  });

  afterAll(async () => {
    await t.close();
  });

  const hit = (body: object, ua = BROWSER) => request(t.server).post('/api/v1/analytics/hit').set('User-Agent', ua).send(body);

  it('counts views, visits by source, devices, languages, searches and the funnel; never bots', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    await hit({ path: '/', entry: true, referrer: 'https://www.google.com/search?q=yoyo', locale: 'lv' }).expect(204);
    await hit({ path: '/c', entry: true, referrer: '', locale: 'lv' }).expect(204);
    await hit({ path: `/listings/${listing.id}-drill`, referrer: '', locale: 'lv' }).expect(204);
    await hit({ path: '/search', referrer: '', locale: 'ru', search: { q: 'Drons', results: 0 } }).expect(204);
    await hit({ path: '/', referrer: 'https://www.google.com/' }, 'Googlebot/2.1 (+http://www.google.com/bot.html)').expect(204);
    await hit({ path: 'not-a-path' }).expect(400);
    const renter = await signedInClient(t, { name: 'Rita' });
    await requestBooking(t, renter, listing.id, 1, 3);

    await owner.get('/admin/analytics').expect(403);
    const a = (await admin.get('/admin/analytics?days=7').expect(200)).body;
    expect(a.totals).toEqual({ views: 4, visits: 2 });
    expect(a.series).toHaveLength(7);
    expect(a.pages).toEqual(expect.arrayContaining([{ key: '/', value: 1 }, { key: '/listings/:id', value: 1 }, { key: '/search', value: 1 }]));
    expect(a.sources).toEqual(expect.arrayContaining([{ key: 'google.com', value: 1 }, { key: '(direct)', value: 1 }]));
    expect(a.devices).toEqual([{ key: 'mobile', value: 4 }]);
    expect(a.searches).toEqual([{ key: 'drons', value: 1 }]);
    expect(a.emptySearches).toEqual([{ key: 'drons', value: 1 }]);
    expect(a.funnel).toMatchObject({ itemViews: 1, requests: 1 });
    expect(a.funnel.signups).toBeGreaterThanOrEqual(0);
  });

  it('scores the SEO of published items, worst first', async () => {
    await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Drill', description: 'Short text here.', photos: 1, district: '' });
    await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Bosch cordless drill with two batteries', description: 'x'.repeat(200), photos: 4 });
    const seo = (await admin.get('/admin/seo').expect(200)).body;
    expect(seo).toMatchObject({ published: 2, healthy: 1 });
    expect(seo.listings[0]).toMatchObject({ title: 'Drill', issues: expect.arrayContaining(['SHORT_TITLE', 'SHORT_DESCRIPTION', 'FEW_PHOTOS', 'NO_DISTRICT']) });
    expect(seo.listings[0].score).toBeLessThan(seo.listings[1].score);
  });
});
