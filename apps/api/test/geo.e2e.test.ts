import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GEO_SLEEP } from '../src/geo/nominatim.client';
import { resetAccounts } from './support/db';
import { startFakeNominatim, type FakeNominatim } from './support/fake-nominatim';
import { signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

const DAY = 24 * 60 * 60_000;

describe('address search', () => {
  let t: TestApp;
  let nominatim: FakeNominatim;
  let anna: Client;

  beforeAll(async () => {
    let advance = (_ms: number) => {};
    nominatim = await startFakeNominatim(() => t.clock.now().getTime());
    // Waiting for the next free second moves the test clock instead of really sleeping.
    t = await createTestApp({
      env: { NOMINATIM_URL: nominatim.url },
      providers: [{ provide: GEO_SLEEP, useValue: async (ms: number) => advance(ms) }],
    });
    advance = (ms) => t.clock.advance(ms);
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    await t.prisma.geoCache.deleteMany();
    nominatim.requests.length = 0;
    nominatim.failing = false;
    t.clock.advance(60 * 60_000);
    anna = await signedInClient(t);
  });

  afterAll(async () => {
    await t.close();
    await nominatim.close();
  });

  describe('GET /geo/search', () => {
    it('finds up to 5 places with city, district and point, and the attribution to show', async () => {
      const res = await anna.get('/geo/search?q=Brīvības%20iela%201&lang=lv').expect(200);

      expect(res.body).toEqual({
        results: [
          { label: 'Brīvības iela 1, Centrs, Rīga, LV-1010, Latvija', city: 'Rīga', district: 'Centrs', lat: 56.949649, lng: 24.105187 },
          { label: 'Jomas iela, Majori, Jūrmala, Latvija', city: 'Jūrmala', district: 'Majori', lat: 56.968, lng: 23.7703 },
        ],
        attribution: '© OpenStreetMap contributors',
      });
      expect(nominatim.requests[0]!.userAgent).toContain('yoyo.rent');
    });

    it('answers the same search (any case and spacing) from the cache for 30 days', async () => {
      await anna.get('/geo/search?q=Brīvības iela 1&lang=lv').expect(200);
      const again = await anna.get('/geo/search?q=%20%20brīvības%20%20IELA%201%20&lang=lv').expect(200);

      expect(again.body.results).toHaveLength(2);
      expect(nominatim.requests).toHaveLength(1);
      await anna.get('/geo/search?q=Brīvības iela 1&lang=ru').expect(200);
      expect(nominatim.requests).toHaveLength(2);

      t.clock.advance(31 * DAY);
      anna = await signedInClient(t);
      await anna.get('/geo/search?q=Brīvības iela 1&lang=lv').expect(200);
      expect(nominatim.requests).toHaveLength(3);
    });

    it('sends at most one request a second to Nominatim, across all users', async () => {
      const boris = await signedInClient(t);
      await anna.get('/geo/search?q=one street&lang=en').expect(200);
      await boris.get('/geo/search?q=two street&lang=en').expect(200);
      await anna.get('/geo/reverse?lat=56.95&lng=24.1&lang=en').expect(200);

      const times = nominatim.requests.map((r) => r.at);
      expect(times).toHaveLength(3);
      expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(1000);
      expect(times[2]! - times[1]!).toBeGreaterThanOrEqual(1000);
    });

    it('answers 503 GEO_UNAVAILABLE when Nominatim fails, and caches nothing', async () => {
      nominatim.failing = true;
      const res = await anna.get('/geo/search?q=Brīvības&lang=en').expect(503);
      expect(res.body.error.code).toBe('GEO_UNAVAILABLE');
      nominatim.failing = false;
      expect((await anna.get('/geo/search?q=Brīvības&lang=en').expect(200)).body.results).toHaveLength(2);
    });

    it('answers 503 GEO_UNAVAILABLE when Nominatim cannot be reached', async () => {
      const offline = await createTestApp({ env: { NOMINATIM_URL: 'http://127.0.0.1:9' } });
      try {
        const user = await signedInClient(offline);
        expect((await user.get('/geo/search?q=Riga&lang=en').expect(503)).body.error.code).toBe('GEO_UNAVAILABLE');
      } finally {
        await offline.close();
      }
    });

    it('allows 30 searches a minute per user', async () => {
      for (let i = 0; i < 30; i++) await anna.get('/geo/search?q=nowhere&lang=en').expect(200);
      await anna.get('/geo/search?q=nowhere&lang=en').expect(429);
    });

    it('needs a sign-in and a query of 2–200 characters', async () => {
      await request(t.server).get('/api/v1/geo/search?q=Riga').expect(401);
      await anna.get('/geo/search?q=R').expect(400);
      await anna.get(`/geo/search?q=${'x'.repeat(201)}`).expect(400);
      await anna.get('/geo/search?q=Riga&lang=de').expect(400);
    });
  });

  describe('GET /geo/reverse', () => {
    it('names the city and district of a point', async () => {
      const res = await anna.get('/geo/reverse?lat=56.9496&lng=24.1052&lang=lv').expect(200);
      expect(res.body).toEqual({ city: 'Rīga', district: 'Centrs', attribution: '© OpenStreetMap contributors' });
      expect(Object.fromEntries(nominatim.requests[0]!.query)).toMatchObject({ lat: '56.9496', lon: '24.1052', 'accept-language': 'lv' });
    });

    it('answers nulls for a point with no address, and refuses points off the globe', async () => {
      expect((await anna.get('/geo/reverse?lat=-60&lng=0&lang=en').expect(200)).body).toMatchObject({ city: null, district: null });
      await anna.get('/geo/reverse?lat=91&lng=0').expect(400);
      await anna.get('/geo/reverse?lat=56.9').expect(400);
    });
  });
});
