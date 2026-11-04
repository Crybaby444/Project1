import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { SessionMeta } from '../auth/refresh-token.service';
import type { Env } from '../config/env';

/** Header the site's /api proxy adds with PROXY_SECRET, so the API knows the request came through it. */
export const PROXY_SECRET_HEADER = 'x-yoyo-proxy-secret';

/** Where configureApp stores the address resolved for each request. */
const CLIENT_IP = Symbol('clientIp');
type WithClientIp = Request & { [CLIENT_IP]?: string };

function sameSecret(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  // Compare fixed-length digests: constant time, whatever the lengths.
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * The client address of a request.
 *
 * - Without PROXY_SECRET (development, tests, local): Express's `req.ip` with TRUST_PROXY_HOPS, as before.
 * - With PROXY_SECRET: X-Forwarded-For is trusted for TRUST_PROXY_HOPS hops (Render: its balancer and
 *   the site proxy = 2) only when the request carries the proxy's secret header; otherwise one hop
 *   fewer (Render: the address its balancer saw). A direct call to the API therefore cannot pick its
 *   own address by sending `X-Forwarded-For: <anything>, x`.
 */
export function resolveClientIp(req: Request, env: Pick<Env, 'TRUST_PROXY_HOPS'> & { PROXY_SECRET?: string | undefined }): string {
  const socketAddress = req.socket.remoteAddress ?? 'unknown';
  if (!env.PROXY_SECRET) return req.ip ?? socketAddress;

  const trusted = sameSecret(req.get(PROXY_SECRET_HEADER), env.PROXY_SECRET);
  const hops = trusted ? env.TRUST_PROXY_HOPS : Math.max(0, env.TRUST_PROXY_HOPS - 1);
  // Nearest first: the socket, then X-Forwarded-For from right to left (as Express's proxy-addr does).
  const forwarded = (req.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reverse();
  const chain = [socketAddress, ...forwarded];
  return chain[Math.min(hops, chain.length - 1)]!;
}

/** Express middleware: resolves the client address once per request (see resolveClientIp). */
export function clientIpMiddleware(env: Parameters<typeof resolveClientIp>[1]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as WithClientIp)[CLIENT_IP] = resolveClientIp(req, env);
    next();
  };
}

/** The client address (the real one behind the trusted proxies). */
export function clientIp(req: Request): string {
  return (req as WithClientIp)[CLIENT_IP] ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/** What a new session records about the device that opened it. */
export function sessionMeta(req: Request): SessionMeta {
  const userAgent = req.get('user-agent');
  return { ip: clientIp(req), ...(userAgent && { userAgent }) };
}
