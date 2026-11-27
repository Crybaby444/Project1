import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Listing } from '../src/generated/prisma/client';
import { resetAccounts, resetDeals } from './support/db';
import { day, requestBooking } from './support/deals';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('catalog search', () => {
  let t: TestApp;
  let anna: Client;
  let boris: Client;

  const get = (query: Record<string, string | number> = {}) =>
    request(t.server).get('/api/v1/catalog/listings').query(query);
  const ids = async (query: Record<string, string | number> = {}) => {
    const res = await get(query).expect(200);
    return (res.body.items as { id: string }[]).map((item) => item.id);
  };
  const live = (overrides: Parameters<typeof seedListing>[2] = {}) => seedListing(t, anna.user, { status: 'PUBLISHED', ...overrides });

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    anna = await signedInClient(t, { name: 'Anna' });
    boris = await signedInClient(t, { name: 'Boris' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('shows one country at a time, and its cities; places counts the countries (owner, 2026-11-16)', async () => {
    const riga = await live();
    const vilnius = await live({ country: 'LT', city: 'Vilnius', district: 'Senamiestis', timeZone: 'Europe/Vilnius' });
    const siauliai = await live({ country: 'LT', city: 'Šiauliai', district: 'Centras', timeZone: 'Europe/Vilnius' });
    expect(await ids({ country: 'LV' })).toEqual([riga.id]);
    expect((await ids({ country: 'LT' })).sort()).toEqual([vilnius.id, siauliai.id].sort());
    expect(await ids({ country: 'LT', city: 'siauliai' })).toEqual([siauliai.id]);
    expect(await ids({ country: 'LV', city: 'vilnius' })).toEqual([]);
    await get({ country: 'US' }).expect(400); // only the Baltics
    await get({ country: 'DE' }).expect(400);
    const all = (await request(t.server).get('/api/v1/catalog/places').expect(200)).body;
    expect(all.countries).toEqual([{ country: 'LT', count: 2 }, { country: 'LV', count: 1 }]);
    const lt = (await request(t.server).get('/api/v1/catalog/places').query({ country: 'LT' }).expect(200)).body;
    expect(lt.cities.map((c: { slug: string }) => c.slug).sort()).toEqual(['siauliai', 'vilnius']);
    expect(lt.districts.map((d: { slug: string }) => d.slug).sort()).toEqual(['centras', 'senamiestis']);
  });

  it('suggests every city of the country as you type, diacritics and local names welcome, with its item count (owner, 2026-11-16)', async () => {
    await live({ city: 'Rīga' });
    const cities = (query: Record<string, string>) => request(t.server).get('/api/v1/catalog/cities').query(query);
    const riga = (await cities({ country: 'LV', q: 'rig' }).expect(200)).body.items;
    expect(riga[0]).toEqual({ name: 'Rīga', slug: 'riga', count: 1 });
    expect((await cities({ country: 'LV', q: 'Рига' }).expect(200)).body.items[0]).toMatchObject({ slug: 'riga' });
    const vent = (await cities({ country: 'LV', q: 'vents' }).expect(200)).body.items;
    expect(vent[0]).toEqual({ name: 'Ventspils', slug: 'ventspils', count: 0 });
    expect((await cities({ country: 'LV', q: 'kaun' }).expect(200)).body.items).toEqual([]);
    expect((await cities({ country: 'LT', q: 'kaun' }).expect(200)).body.items[0]).toMatchObject({ name: 'Kaunas' });
    expect((await cities({ country: 'EE', q: 'tall' }).expect(200)).body.items[0]).toMatchObject({ name: 'Tallinn' });
    expect((await cities({ country: 'LT', q: 'a' }).expect(200)).body.items.length).toBeLessThanOrEqual(8);
    await cities({ country: 'US', q: 'new' }).expect(400);
    await cities({ country: 'DE', q: 'berl' }).expect(400);
    await cities({ country: 'LV', q: '' }).expect(400);
    // A city written another way is still the same city in search.
    const siauliai = await live({ country: 'LT', city: 'Siauliai', district: 'Centras', timeZone: 'Europe/Vilnius' });
    const suggested = (await cities({ country: 'LT', q: 'šiaul' }).expect(200)).body.items[0];
    expect(await ids({ country: 'LT', city: suggested.slug })).toEqual([siauliai.id]);
  });

  it('counts the visible items of each category, for the catalog index', async () => {
    const drills = await categoryId(t, 'drills-drivers');
    await live();
    await live();
    await live({ status: 'DRAFT' });
    await seedListing(t, boris.user, { status: 'PUBLISHED' });
    await t.prisma.user.update({ where: { id: boris.user.id }, data: { blockedAt: new Date() } });
    const body = (await request(t.server).get('/api/v1/catalog/category-counts').expect(200)).body;
    expect(body.counts).toEqual({ [drills]: 2 });
  });

  it('shows only published items of owners who are still here (Review Focus 1)', async () => {
    const shown = await live();
    await seedListing(t, anna.user, { status: 'DRAFT' });
    await seedListing(t, anna.user, { status: 'HIDDEN' });
    await seedListing(t, anna.user, { status: 'REJECTED' });
    await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });
    const blocked = await seedListing(t, boris.user, { status: 'PUBLISHED' });
    await t.prisma.user.update({ where: { id: boris.user.id }, data: { blockedAt: t.clock.now() } });

    expect(await ids()).toEqual([shown.id]);
    expect(await ids()).not.toContain(blocked.id);
  });

  it('answers with the card fields only, never the point or review data', async () => {
    await live();
    const res = await get().expect(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, pageSize: 24 });
    const item = res.body.items[0];
    expect(Object.keys(item).sort()).toEqual(
      ['categoryId', 'city', 'condition', 'contentLocale', 'country', 'cover', 'dailyCents', 'demo', 'depositCents', 'district', 'id', 'ownerId', 'publishedAt', 'rating', 'reviewCount', 'title', 'weeklyDiscountPercent'].sort(),
    );
    expect(JSON.stringify(res.body)).not.toMatch(/"lat"|"lng"|version|rejectionReason/);
  });

  describe('text', () => {
    let drill: Listing;
    let bike: Listing;

    beforeEach(async () => {
      drill = await live({ title: 'Bosch cordless drill' });
      bike = await live({
        title: 'Velosipēds pilsētai',
        description: 'Ērts pilsētas velosipēds ar grozu un gaismām, labā stāvoklī.',
        categoryId: await categoryId(t, 'cycling'),
        attributes: {},
      });
    });

    it('finds words, typos and text without diacritics', async () => {
      expect(await ids({ q: 'drill' })).toEqual([drill.id]);
      expect(await ids({ q: 'dril' })).toEqual([drill.id]);
      expect(await ids({ q: 'drlil' })).toEqual([]);
      expect(await ids({ q: 'velosipeds' })).toEqual([bike.id]);
      expect(await ids({ q: 'GROZU' })).toEqual([bike.id]);
    });

    it('finds items through the name of their category in any language', async () => {
      expect(await ids({ q: 'шуруповерт' })).toEqual([drill.id]);
      expect(await ids({ q: 'urbjmasinas' })).toEqual([drill.id]);
    });

    it('finds a word typed in another language or form through the category (owner, 2026-11-27)', async () => {
      // The drill is listed in English; its category answers to its Russian and Latvian names in any form.
      expect(await ids({ q: 'дрель' })).toEqual([drill.id]);
      expect(await ids({ q: 'дрели' })).toEqual([drill.id]);
      expect(await ids({ q: 'urbjmašīna' })).toEqual([drill.id]);
      // The bike is listed in Latvian; its category holds kinds such as «Городской велосипед».
      expect(await ids({ q: 'велосипед' })).toEqual([bike.id]);
      expect(await ids({ q: 'velosipēdu' })).toEqual([bike.id]);
    });

    it('finds everyday words for a category: «фотоаппарат», «зеркалка», «керхер»', async () => {
      const camera = await live({ title: 'Canon EOS 250D ar objektīvu', description: 'Spoguļkamera ar 18–55 mm objektīvu.', categoryId: await categoryId(t, 'cameras'), attributes: {} });
      const washer = await live({ title: 'Augstspiediena mazgātājs K5', description: 'Terases un auto mazgāšanai.', categoryId: await categoryId(t, 'pressure-washers'), attributes: {} });
      expect(await ids({ q: 'фотоаппарат' })).toEqual([camera.id]);
      expect(await ids({ q: 'зеркалка' })).toEqual([camera.id]);
      expect(await ids({ q: 'fotoaparāts' })).toEqual([camera.id]);
      expect(await ids({ q: 'керхер' })).toEqual([washer.id]);
    });

    it('wants every word, each from the text or the category, in any order', async () => {
      expect(await ids({ q: 'дрель bosch' })).toEqual([drill.id]);
      expect(await ids({ q: 'дрель makita' })).toEqual([]);
      expect(await ids({ q: 'pilsetai velosipeds' })).toEqual([bike.id]);
    });

    it('takes wildcards and quotes literally (Review Focus 2)', async () => {
      expect(await ids({ q: '%_' })).toEqual([]);
      expect(await ids({ q: "'; DROP TABLE \"Listing\"; --" })).toEqual([]);
      expect(await ids()).toHaveLength(2);
    });
  });

  it('filters by category with its subcategories, price and district', async () => {
    const cheap = await live({ dailyCents: 500, district: 'Āgenskalns' });
    const dear = await live({ dailyCents: 5000 });
    expect(await ids({ category: 'tools' })).toEqual(expect.arrayContaining([cheap.id, dear.id]));
    expect(await ids({ category: 'electronics' })).toEqual([]);
    expect(await ids({ category: 'no-such-category' })).toEqual([]);
    expect(await ids({ priceMax: 1000 })).toEqual([cheap.id]);
    expect(await ids({ priceMin: 1000 })).toEqual([dear.id]);
    expect(await ids({ district: 'agenskalns' })).toEqual([cheap.id]);
    expect(await ids({ district: 'teika' })).toEqual([]);
    const places = await request(t.server).get('/api/v1/catalog/places').expect(200);
    expect(places.body.districts).toEqual(
      expect.arrayContaining([{ district: 'Āgenskalns', slug: 'agenskalns', count: 1 }, { district: 'Centrs', slug: 'centrs', count: 1 }]),
    );
  });

  it('finds only items free on every chosen day (Review Focus 3)', async () => {
    const booked = await live({ minDays: 1 });
    const closed = await live({ minDays: 1 });
    const longOnly = await live({ minDays: 3 });
    const booking = await requestBooking(t, boris, booked.id, 10, 12);
    await t.prisma.$executeRaw`UPDATE "Booking" SET "reserved" = daterange(${day(t, 10)}::date, ${day(t, 13)}::date, '[)') WHERE "id" = ${booking.id}`;
    await t.prisma.unavailability.create({ data: { listingId: closed.id, start: new Date(`${day(t, 10)}T00:00:00Z`), end: new Date(`${day(t, 12)}T00:00:00Z`) } });

    const free = (from: number, to: number) => ids({ start: day(t, from), end: day(t, to) });
    expect(await free(11, 13)).toEqual([longOnly.id]);
    expect((await free(13, 15)).sort()).toEqual([booked.id, closed.id, longOnly.id].sort());
    expect(await free(13, 14)).not.toContain(longOnly.id);

    await t.prisma.$executeRaw`UPDATE "Booking" SET "reserved" = NULL WHERE "id" = ${booking.id}`;
    expect(await free(11, 13)).toEqual(expect.arrayContaining([booked.id]));
  });

  it('refuses dates in the past or too far ahead, and broken queries', async () => {
    expect((await get({ start: day(t, -1), end: day(t, 2) }).expect(400)).body.error.fields).toHaveProperty('start');
    expect((await get({ start: day(t, 400), end: day(t, 401) }).expect(400)).body.error.fields).toHaveProperty('start');
    expect((await get({ start: day(t, 1) }).expect(400)).body.error.fields).toHaveProperty('end');
    await get({ sort: 'cheapest' }).expect(400);
    await get({ district: 'Āgenskalns' }).expect(400);
  });

  it('sorts and pages without overlap', async () => {
    for (let i = 0; i < 26; i++) await live({ dailyCents: 1000 + i * 10 });
    const asc = await get({ sort: 'price_asc' }).expect(200);
    const prices = (asc.body.items as { dailyCents: number }[]).map((item) => item.dailyCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(asc.body.total).toBe(26);
    const desc = await get({ sort: 'price_desc' }).expect(200);
    expect(desc.body.items[0].dailyCents).toBe(1250);
    const first = await ids();
    const second = await ids({ page: 2 });
    expect(first).toHaveLength(24);
    expect(second).toHaveLength(2);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });

  it('puts the map at the middle of a 0.01° cell, never at the point', async () => {
    const a = await live({ lat: 56.949651, lng: 24.10519, dailyCents: 900 });
    const b = await live({ lat: 56.941, lng: 24.109, dailyCents: 800 });
    await live({ lat: 56.97, lng: 24.2 });
    const res = await request(t.server).get('/api/v1/catalog/map').expect(200);
    expect(res.body).toMatchObject({ total: 3, truncated: false });
    const pin = (res.body.pins as { lat: number; lng: number; count: number; items: { id: string }[] }[]).find((p) => p.count === 2)!;
    expect(pin).toMatchObject({ lat: 56.945, lng: 24.105 });
    expect(pin.items.map((item) => item.id)).toEqual([b.id, a.id]);
    expect(JSON.stringify(res.body)).not.toMatch(/56\.949651|24\.10519|56\.941\b/);
  });

  it('suggests categories and items, with a limit per address', async () => {
    const drill = await live({ title: 'Bosch cordless drill' });
    const res = await request(t.server).get('/api/v1/catalog/suggest').query({ q: 'elek', lang: 'lv' }).expect(200);
    expect(res.body.categories.map((c: { slug: string }) => c.slug)).toEqual(expect.arrayContaining(['electronics', 'e-scooters']));
    const items = await request(t.server).get('/api/v1/catalog/suggest').query({ q: 'dri' }).expect(200);
    expect(items.body.listings).toEqual([{ id: drill.id, title: 'Bosch cordless drill', cover: expect.any(Object) }]);
    // A Russian word in its own form suggests the category and the item listed in English.
    const russian = await request(t.server).get('/api/v1/catalog/suggest').query({ q: 'дрель', lang: 'ru' }).expect(200);
    expect(russian.body.categories[0].names.ru).toMatch(/^Дрели/);
    expect(russian.body.listings.map((item: { id: string }) => item.id)).toEqual([drill.id]);
    await request(t.server).get('/api/v1/catalog/suggest').query({ q: 'd' }).expect(400);
    // Three counted above (the one-letter query is refused before it counts): 117 more reach 120.
    for (let i = 0; i < 117; i++) await request(t.server).get('/api/v1/catalog/suggest').query({ q: 'xx' });
    await request(t.server).get('/api/v1/catalog/suggest').query({ q: 'xx' }).expect(429);
  });
});
