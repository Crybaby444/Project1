import type { Request } from 'express';
import type { SessionMeta } from '../auth/refresh-token.service';

/** The client address (the real one behind TRUST_PROXY_HOPS proxies). */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/** What a new session records about the device that opened it. */
export function sessionMeta(req: Request): SessionMeta {
  const userAgent = req.get('user-agent');
  return { ip: clientIp(req), ...(userAgent && { userAgent }) };
}
