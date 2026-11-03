import { renderHook, waitFor } from '@testing-library/react';
import { useApiHealth } from './use-api-health';

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
}

function mockFetchReject(error: Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(error)),
  );
}

async function settle() {
  const { result } = renderHook(() => useApiHealth());
  expect(result.current).toBe('checking');
  await waitFor(() => expect(result.current).not.toBe('checking'));
  return result.current;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useApiHealth', () => {
  it('is online for 200 ok', async () => {
    mockFetch(200, { status: 'ok', db: 'up', version: '0.1.0' });
    expect(await settle()).toBe('online');
  });

  it('is offline when the API reports a degraded state', async () => {
    mockFetch(503, { status: 'degraded', db: 'down', version: '0.1.0' });
    expect(await settle()).toBe('offline');
  });

  it('is offline when the API cannot be reached', async () => {
    mockFetchReject(new TypeError('Failed to fetch'));
    expect(await settle()).toBe('offline');
  });
});
