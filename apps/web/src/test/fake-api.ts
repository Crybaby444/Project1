import { createApiClient, type ApiClient } from '@yoyo/api-client';
import type { PublicUser } from '@yoyo/shared';

export type FakeReply = { status: number; body?: unknown; headers?: Record<string, string> };
/** `'POST /api/v1/auth/login'` → a reply, or a function of the request body. */
export type FakeRoutes = Record<string, FakeReply | ((body: unknown) => FakeReply | Promise<FakeReply>)>;
export type FakeCall = { method: string; path: string; body: unknown };

/**
 * A typed API client backed by a table of canned answers. Unknown routes answer 404.
 * `calls` records every request, so tests can check what the screen sent.
 */
export function fakeApi(routes: FakeRoutes): { client: ApiClient; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const fetch = (async (input: RequestInfo | URL) => {
    const request = input as Request;
    const path = new URL(request.url).pathname;
    const text = await request.text();
    const body: unknown = text ? JSON.parse(text) : undefined;
    calls.push({ method: request.method, path, body });
    const route = routes[`${request.method} ${path}`];
    const reply = typeof route === 'function' ? await route(body) : route;
    if (!reply) return json({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Not found' } } });
    return json(reply);
  }) as typeof globalThis.fetch;
  return { client: createApiClient('http://site.test', { fetch }), calls };
}

function json({ status, body, headers = {} }: FakeReply): Response {
  const empty = body === undefined || status === 204;
  return new Response(empty ? null : JSON.stringify(body), {
    status,
    headers: empty ? headers : { 'content-type': 'application/json', ...headers },
  });
}

export const apiError = (
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  headers?: Record<string, string>,
) =>
  ({
    status,
    body: { error: { code, message: code, ...extra } },
    ...(headers && { headers }),
  }) satisfies FakeReply;

export function testUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 'user-1',
    email: 'anna@mail.lv',
    name: 'Anna Bērziņa',
    city: null,
    about: null,
    locale: 'en',
    theme: 'system',
    role: 'USER',
    emailVerified: true,
    phone: null,
    phoneVerified: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

/** `GET /api/v1/me` for a signed-in user (or 401 for `null`). */
export const meRoute = (user: PublicUser | null): FakeRoutes => ({
  'GET /api/v1/me': user ? { status: 200, body: { user } } : apiError(401, 'AUTH_UNAUTHENTICATED'),
});
