import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { PROXY_SECRET_HEADER, resolveClientIp } from './request-meta';

const SECRET = 'a-proxy-secret-that-is-long-enough-0123';

/** A request as Express sees it behind Render: the socket is Render's balancer. */
function fakeRequest(headers: Record<string, string>, expressIp = '10.0.0.1'): Request {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ip: expressIp,
    socket: { remoteAddress: '10.10.10.10' },
    headers: lower,
    get: (name: string) => lower[name.toLowerCase()],
  } as unknown as Request;
}

describe('resolveClientIp', () => {
  // X-Forwarded-For as Render passes it on: "<what the Vercel proxy said>, <the address Render saw>".
  const forwarded = { 'X-Forwarded-For': '198.51.100.7, 76.76.21.21' };

  it('keeps today’s behaviour (Express req.ip) when PROXY_SECRET is unset', () => {
    expect(resolveClientIp(fakeRequest(forwarded, '198.51.100.7'), { TRUST_PROXY_HOPS: 2 })).toBe('198.51.100.7');
  });

  it('trusts the forwarded client address (2 hops) when the proxy secret matches', () => {
    const req = fakeRequest({ ...forwarded, [PROXY_SECRET_HEADER]: SECRET });
    expect(resolveClientIp(req, { TRUST_PROXY_HOPS: 2, PROXY_SECRET: SECRET })).toBe('198.51.100.7');
  });

  it('uses the address Render saw (1 hop) without the header or with a wrong one', () => {
    const env = { TRUST_PROXY_HOPS: 2, PROXY_SECRET: SECRET };
    expect(resolveClientIp(fakeRequest(forwarded), env)).toBe('76.76.21.21');
    expect(resolveClientIp(fakeRequest({ ...forwarded, [PROXY_SECRET_HEADER]: 'wrong' }), env)).toBe('76.76.21.21');
    expect(resolveClientIp(fakeRequest({ ...forwarded, [PROXY_SECRET_HEADER]: `${SECRET}x` }), env)).toBe('76.76.21.21');
  });

  it('falls back to the socket address when there are fewer forwarded hops than trusted', () => {
    const env = { TRUST_PROXY_HOPS: 2, PROXY_SECRET: SECRET };
    expect(resolveClientIp(fakeRequest({}), env)).toBe('10.10.10.10');
    expect(resolveClientIp(fakeRequest({ 'X-Forwarded-For': '203.0.113.5', [PROXY_SECRET_HEADER]: SECRET }), env)).toBe(
      '203.0.113.5',
    );
  });
});
