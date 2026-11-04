/** Header the API checks (with PROXY_SECRET) before it trusts the visitor address this proxy forwards. */
export const PROXY_SECRET_HEADER = 'x-yoyo-proxy-secret';

/** Whether a site path belongs to the API (proxied) rather than to the pages. */
export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

/** The same path and query on the API origin. */
export function apiTarget(pathname: string, search: string, apiOrigin: string): URL {
  return new URL(`${pathname}${search}`, `${apiOrigin.replace(/\/+$/, '')}/`);
}

/**
 * The headers to forward to the API: the visitor's, plus the server-only proxy secret when it is
 * configured. A secret header sent by the visitor is never passed on.
 */
export function apiRequestHeaders(incoming: Headers, secret: string | undefined): Headers {
  const headers = new Headers(incoming);
  headers.delete(PROXY_SECRET_HEADER);
  if (secret) headers.set(PROXY_SECRET_HEADER, secret);
  return headers;
}
