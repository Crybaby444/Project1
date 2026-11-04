import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface NominatimRequest {
  path: string;
  query: URLSearchParams;
  userAgent: string | undefined;
  /** When it arrived, on the test's clock. */
  at: number;
}

export interface FakeNominatim {
  url: string;
  requests: NominatimRequest[];
  /** Answer every request with HTTP 500 (as when Nominatim is overloaded). */
  failing: boolean;
  close(): Promise<void>;
}

const RIGA_PLACE = {
  lat: '56.9496487',
  lon: '24.1051865',
  display_name: 'Brīvības iela 1, Centrs, Rīga, LV-1010, Latvija',
  address: { road: 'Brīvības iela', house_number: '1', suburb: 'Centrs', city: 'Rīga', postcode: 'LV-1010', country: 'Latvija' },
};

const JURMALA_PLACE = {
  lat: '56.968',
  lon: '23.7703',
  display_name: 'Jomas iela, Majori, Jūrmala, Latvija',
  address: { road: 'Jomas iela', quarter: 'Majori', town: 'Jūrmala', country: 'Latvija' },
};

/** A local stand-in for Nominatim's /search and /reverse (jsonv2). */
export async function startFakeNominatim(now: () => number): Promise<FakeNominatim> {
  const state: FakeNominatim = { url: '', requests: [], failing: false, close: async () => {} };
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://fake');
    state.requests.push({ path: url.pathname, query: url.searchParams, userAgent: req.headers['user-agent'], at: now() });
    const reply = (status: number, body: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (state.failing) return reply(500, { error: 'overloaded' });
    if (url.pathname === '/search') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      if (q.includes('nowhere')) return reply(200, []);
      return reply(200, q.includes('jomas') ? [JURMALA_PLACE] : [RIGA_PLACE, JURMALA_PLACE]);
    }
    if (url.pathname === '/reverse') {
      if (Number(url.searchParams.get('lat')) < 0) return reply(200, { error: 'Unable to geocode' });
      return reply(200, RIGA_PLACE);
    }
    reply(404, {});
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  state.close = () => new Promise((resolve) => server.close(() => resolve()));
  return state;
}
