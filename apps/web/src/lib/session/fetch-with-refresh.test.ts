import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFetchWithRefresh } from './fetch-with-refresh';

type Call = { url: string; method: string };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const unauthenticated = () =>
  json(401, { error: { code: 'AUTH_UNAUTHENTICATED', message: 'Sign in to continue' } });
const expired = () =>
  json(401, { error: { code: 'TOKEN_EXPIRED', message: 'This link or code has expired' } });

/**
 * A fake API: `/api/v1/me` answers 401 until a refresh succeeded, then 200.
 * `refreshWorks` decides how /auth/refresh answers.
 */
function fakeApi({
  refreshWorks,
  firstFailure = unauthenticated,
}: {
  refreshWorks: boolean;
  firstFailure?: () => Response;
}) {
  const calls: Call[] = [];
  let signedIn = false;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request =
      input instanceof Request ? input : new Request(new URL(String(input), 'http://site.test'), init);
    const url = request.url;
    calls.push({ url, method: request.method });
    await new Promise((resolve) => setTimeout(resolve, 1)); // answers arrive later, like a real network
    if (url.endsWith('/api/v1/auth/refresh')) {
      if (!refreshWorks) return unauthenticated();
      signedIn = true;
      return json(200, { user: { id: 'u1' } });
    }
    if (url.endsWith('/api/v1/auth/login')) {
      return json(401, { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Wrong email or password' } });
    }
    if (url.endsWith('/api/v1/auth/logout-all'))
      return signedIn ? new Response(null, { status: 204 }) : firstFailure();
    if (url.endsWith('/api/v1/me')) return signedIn ? json(200, { user: { id: 'u1' } }) : firstFailure();
    if (url.endsWith('/api/v1/forbidden'))
      return json(403, { error: { code: 'AUTH_FORBIDDEN', message: 'No' } });
    return json(404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const refreshCalls = (calls: Call[]) => calls.filter((c) => c.url.endsWith('/auth/refresh'));

describe('fetchWithRefresh', () => {
  beforeEach(() => {
    // Without Web Locks the module-level promise keeps refreshes to one at a time.
    vi.stubGlobal('navigator', { ...navigator, locks: undefined });
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes exactly once for ten parallel 401s, then repeats every request (Review Focus 1)', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    const responses = await Promise.all(Array.from({ length: 10 }, () => fetchWithRefresh('/api/v1/me')));

    expect(responses.map((r) => r.status)).toEqual(Array(10).fill(200));
    expect(refreshCalls(calls)).toHaveLength(1);
    expect(calls.filter((c) => c.url.endsWith('/api/v1/me'))).toHaveLength(20);
  });

  it('also refreshes when the access token has expired', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: true, firstFailure: expired });
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    expect((await fetchWithRefresh('/api/v1/me')).status).toBe(200);
    expect(refreshCalls(calls)).toHaveLength(1);
  });

  it('gives every caller the 401 when the refresh fails, with no second round (Review Focus 1)', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: false });
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    const responses = await Promise.all(Array.from({ length: 10 }, () => fetchWithRefresh('/api/v1/me')));

    expect(responses.map((r) => r.status)).toEqual(Array(10).fill(401));
    expect(refreshCalls(calls)).toHaveLength(1);
    expect(calls.filter((c) => c.url.endsWith('/api/v1/me'))).toHaveLength(10); // not retried after a failed refresh
  });

  it('does not loop when the repeated request is refused again', async () => {
    const { fetch: base, calls } = fakeApi({ refreshWorks: true });
    // The session is refreshed, but this endpoint keeps answering 401.
    const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await base(input, init);
      return String(input instanceof Request ? input.url : input).endsWith('/api/v1/me')
        ? unauthenticated()
        : response;
    }) as typeof globalThis.fetch;
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    expect((await fetchWithRefresh('/api/v1/me')).status).toBe(401);
    expect(refreshCalls(calls)).toHaveLength(1);
    expect(calls.filter((c) => c.url.endsWith('/api/v1/me'))).toHaveLength(2);
  });

  it('never refreshes for the auth endpoints themselves (a wrong password is just a 401)', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    const response = await fetchWithRefresh('/api/v1/auth/login', { method: 'POST', body: '{}' });

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(refreshCalls(calls)).toHaveLength(0);
  });

  it('does refresh for the auth endpoints that need a session (sign out everywhere, resend the email)', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    expect((await fetchWithRefresh('/api/v1/auth/logout-all', { method: 'POST' })).status).toBe(204);
    expect(refreshCalls(calls)).toHaveLength(1);
  });

  it('without Web Locks, skips its refresh when another tab refreshed a moment ago', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { refreshOnce } = createFetchWithRefresh(fetch);
    window.localStorage.setItem('yoyo-refreshed-at', String(Date.now()));

    await expect(refreshOnce()).resolves.toBe(true);
    expect(refreshCalls(calls)).toHaveLength(0);
    window.localStorage.removeItem('yoyo-refreshed-at');
  });

  it('passes other errors straight through', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    expect((await fetchWithRefresh('/api/v1/forbidden')).status).toBe(403);
    expect(refreshCalls(calls)).toHaveLength(0);
  });

  it('repeats a Request object with its body intact (as openapi-fetch sends it)', async () => {
    const bodies: string[] = [];
    let refreshed = false;
    const fetch = (async (input: RequestInfo | URL) => {
      const request =
        input instanceof Request ? input : new Request(new URL(String(input), 'http://site.test'));
      if (request.url.endsWith('/auth/refresh')) {
        refreshed = true;
        return json(200, {});
      }
      bodies.push(await request.text());
      return refreshed ? json(200, { ok: true }) : unauthenticated();
    }) as typeof globalThis.fetch;
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    const request = new Request('http://site.test/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Anna' }),
    });
    expect((await fetchWithRefresh(request)).status).toBe(200);
    expect(bodies).toEqual(['{"name":"Anna"}', '{"name":"Anna"}']);
  });

  it('uses Web Locks when the browser has them, so tabs take turns', async () => {
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { refreshOnce } = createFetchWithRefresh(fetch);

    await expect(Promise.all([refreshOnce(), refreshOnce(), refreshOnce()])).resolves.toEqual([
      true,
      true,
      true,
    ]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe('yoyo-refresh');
    expect(refreshCalls(calls)).toHaveLength(1);
  });

  it('skips its own refresh when another tab refreshed while it waited for the lock', async () => {
    let release: () => void = () => {};
    const otherTab = new Promise<void>((resolve) => (release = resolve));
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      await otherTab; // another tab holds the lock and refreshes meanwhile
      return callback();
    });
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    const { fetch, calls } = fakeApi({ refreshWorks: true });
    const { refreshOnce } = createFetchWithRefresh(fetch);

    const pending = refreshOnce();
    window.localStorage.setItem('yoyo-refreshed-at', String(Date.now() + 1));
    release();

    await expect(pending).resolves.toBe(true);
    expect(refreshCalls(calls)).toHaveLength(0);
    window.localStorage.removeItem('yoyo-refreshed-at');
  });

  it('allows a new refresh once the previous one has finished', async () => {
    const { fetch, calls } = fakeApi({ refreshWorks: false });
    const { refreshOnce } = createFetchWithRefresh(fetch);

    expect(await refreshOnce()).toBe(false);
    expect(await refreshOnce()).toBe(false);
    expect(refreshCalls(calls)).toHaveLength(2);
  });

  it('treats a network failure during the refresh as "not refreshed"', async () => {
    const fetch = (async (input: RequestInfo | URL) => {
      if (String(input instanceof Request ? input.url : input).endsWith('/auth/refresh'))
        throw new TypeError('Failed to fetch');
      return unauthenticated();
    }) as typeof globalThis.fetch;
    const { fetchWithRefresh } = createFetchWithRefresh(fetch);

    expect((await fetchWithRefresh('/api/v1/me')).status).toBe(401);
  });
});
