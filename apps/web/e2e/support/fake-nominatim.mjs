// A local stand-in for Nominatim's /search and /reverse (jsonv2) for the e2e API, so the tests never
// call OpenStreetMap's servers. Started by playwright.config.ts; answers like apps/api's test fake.
import { createServer } from 'node:http';

const port = Number(process.env.FAKE_NOMINATIM_PORT ?? 4599);

const RIGA = {
  lat: '56.9496487',
  lon: '24.1051865',
  display_name: 'Brīvības iela 1, Centrs, Rīga, LV-1010, Latvija',
  address: {
    road: 'Brīvības iela',
    house_number: '1',
    suburb: 'Centrs',
    city: 'Rīga',
    postcode: 'LV-1010',
    country: 'Latvija',
  },
};

const JURMALA = {
  lat: '56.968',
  lon: '23.7703',
  display_name: 'Jomas iela, Majori, Jūrmala, Latvija',
  address: { road: 'Jomas iela', quarter: 'Majori', town: 'Jūrmala', country: 'Latvija' },
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://fake');
  const reply = (status, body) =>
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  if (url.pathname === '/status') return reply(200, { status: 'ok' });
  if (url.pathname === '/search') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    if (q.includes('nowhere')) return reply(200, []);
    return reply(200, q.includes('jomas') ? [JURMALA] : [RIGA, JURMALA]);
  }
  if (url.pathname === '/reverse') {
    const lng = Number(url.searchParams.get('lon'));
    // West of the Riga result (a click left of the pin in the e2e map) answers Jūrmala.
    return reply(200, lng < 24.1 ? JURMALA : RIGA);
  }
  reply(404, {});
}).listen(port, '127.0.0.1');
