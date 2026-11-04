import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeClock } from '../../test/support/fake-clock';
import { startFakeNominatim, type FakeNominatim } from '../../test/support/fake-nominatim';
import { NominatimClient } from './nominatim.client';

describe('NominatimClient', () => {
  let nominatim: FakeNominatim;
  const clock = new FakeClock(new Date('2026-11-04T10:00:00Z'));

  beforeAll(async () => {
    nominatim = await startFakeNominatim(() => clock.now().getTime());
  });

  afterAll(async () => {
    await nominatim.close();
  });

  it('lets at most one request a second through; the rest wait their turn up to 5 s, then 503 GEO_UNAVAILABLE', async () => {
    const waits: number[] = [];
    const client = new NominatimClient(nominatim.url, clock, async (ms) => void waits.push(ms));

    const results = await Promise.allSettled(Array.from({ length: 7 }, (_, i) => client.search(`street ${i}`, 'en')));

    expect(waits).toEqual([1000, 2000, 3000, 4000, 5000]);
    expect(results.slice(0, 6).every((result) => result.status === 'fulfilled')).toBe(true);
    expect(results[6]).toMatchObject({ status: 'rejected', reason: { code: 'GEO_UNAVAILABLE', status: 503 } });
  });

  it('asks for jsonv2 with addresses, in the given language, as Yoyo', async () => {
    clock.advance(60_000);
    const client = new NominatimClient(nominatim.url, clock, async () => undefined);
    const places = await client.search('Brīvības iela 1', 'lv');

    const sent = nominatim.requests.at(-1)!;
    expect(sent.path).toBe('/search');
    expect(Object.fromEntries(sent.query)).toMatchObject({ q: 'Brīvības iela 1', format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'lv' });
    expect(sent.userAgent).toBe('Yoyo/1.0 (+https://yoyo.rent)');
    expect(places[0]).toEqual({ label: 'Brīvības iela 1, Centrs, Rīga, LV-1010, Latvija', city: 'Rīga', district: 'Centrs', lat: 56.949649, lng: 24.105187 });
    expect(places[1]).toMatchObject({ city: 'Jūrmala', district: 'Majori' });
  });
});
