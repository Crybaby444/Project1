import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A local stand-in for the few Stripe endpoints Yoyo calls (payment intents, refunds, transfers). It checks
 * the secret key and the Idempotency-Key header like Stripe does: the same key returns the first answer.
 * Payment methods: pm_card_visa succeeds, pm_card_chargeDeclined is declined, pm_card_authenticationRequired
 * needs 3-D Secure.
 */
export interface FakeStripe {
  url: string;
  key: string;
  calls: { path: string; form: URLSearchParams; idempotencyKey: string | undefined }[];
  /** What the bank's 3-D Secure page does when the person confirms: the intent succeeds. */
  confirm(paymentIntent: string): void;
  close(): Promise<void>;
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer) => (data += chunk.toString()));
    req.on('end', () => resolve(data));
  });
}

export async function startFakeStripe(): Promise<FakeStripe> {
  const key = 'sk_test_fake_0123456789';
  const calls: FakeStripe['calls'] = [];
  const answered = new Map<string, { status: number; json: unknown }>();
  let n = 0;
  const intents = new Map<string, { id: string; status: string; amount: number; currency: string; payment_method: { id: string; card: { brand: string; last4: string } } }>();
  const server: Server = createServer((req, res) => {
    void (async () => {
      const send = (status: number, json: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(json));
      if (req.headers.authorization !== `Bearer ${key}`) return send(401, { error: { type: 'invalid_request_error', message: 'Invalid API Key' } });
      const form = new URLSearchParams(await body(req));
      const idem = req.headers['idempotency-key'] as string | undefined;
      calls.push({ path: req.url ?? '', form, idempotencyKey: idem });
      const cacheKey = idem ? `${req.url} ${idem}` : undefined;
      if (cacheKey && answered.has(cacheKey)) {
        const first = answered.get(cacheKey)!;
        return send(first.status, first.json);
      }
      let status = 200;
      let json: unknown;
      if (req.method === 'POST' && req.url === '/v1/payment_intents') {
        const pm = form.get('payment_method');
        n += 1;
        const card = { brand: 'visa', last4: '4242' };
        if (pm === 'pm_card_chargeDeclined') {
          status = 402;
          json = { error: { type: 'card_error', code: 'card_declined', decline_code: 'generic_decline', message: 'Your card was declined.' } };
        } else if (pm === 'pm_card_authenticationRequired') {
          intents.set(`pi_3Test${String(n).padStart(10, '0')}`, { id: `pi_3Test${String(n).padStart(10, '0')}`, status: 'requires_action', amount: Number(form.get('amount')), currency: form.get('currency') ?? 'eur', payment_method: { id: pm, card } });
          json = { id: `pi_3Test${String(n).padStart(10, '0')}`, status: 'requires_action', client_secret: `pi_3Test${String(n).padStart(10, '0')}_secret`, payment_method: { id: pm, card } };
        } else {
          json = { id: `pi_3Test${String(n).padStart(10, '0')}`, status: 'succeeded', amount: Number(form.get('amount')), currency: form.get('currency'), payment_method: { id: pm, card } };
        }
      } else if (req.method === 'GET' && req.url?.startsWith('/v1/payment_intents/')) {
        const id = decodeURIComponent(req.url.slice('/v1/payment_intents/'.length).split('?')[0]!);
        const intent = intents.get(id);
        if (intent) json = intent;
        else {
          status = 404;
          json = { error: { type: 'invalid_request_error', message: 'No such payment_intent' } };
        }
      } else if (req.method === 'POST' && req.url === '/v1/refunds') {
        n += 1;
        json = { id: `re_${n}`, status: 'succeeded', payment_intent: form.get('payment_intent'), amount: Number(form.get('amount')) };
      } else if (req.method === 'POST' && req.url === '/v1/transfers') {
        n += 1;
        json = { id: `tr_${n}`, destination: form.get('destination'), amount: Number(form.get('amount')) };
      } else if (req.method === 'POST' && req.url === '/v1/accounts') {
        n += 1;
        json = { id: `acct_TEST${n}`, type: form.get('type'), country: form.get('country'), email: form.get('email') };
      } else if (req.method === 'POST' && req.url === '/v1/account_links') {
        json = { url: `https://connect.stripe.test/setup/${form.get('account')}`, return_url: form.get('return_url') };
      } else {
        status = 404;
        json = { error: { type: 'invalid_request_error', message: 'Unrecognized request URL' } };
      }
      if (cacheKey) answered.set(cacheKey, { status, json });
      send(status, json);
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const confirm = (id: string) => {
    const intent = intents.get(id);
    if (intent) intent.status = 'succeeded';
  };
  return { url: `http://127.0.0.1:${port}`, key, calls, confirm, close: () => new Promise((resolve) => server.close(() => resolve())) };
}
