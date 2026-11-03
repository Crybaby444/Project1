import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@yoyo/api-client';
import { type ApiHealth, useApiHealth } from './use-api-health';

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

async function settle(fetchImpl: typeof fetch): Promise<ApiHealth> {
  const client = createApiClient('http://api.test', { fetch: fetchImpl });
  const { result } = renderHook(() => useApiHealth(client));
  expect(result.current).toBe('checking');
  await waitFor(() => expect(result.current).not.toBe('checking'));
  return result.current;
}

describe('useApiHealth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is online only for 200 with status ok', async () => {
    expect(await settle(mockFetch(200, { status: 'ok', db: 'up', version: '0.1.0' }))).toBe('online');
  });

  it('is offline when the API reports degraded', async () => {
    expect(await settle(mockFetch(503, { status: 'degraded', db: 'down', version: '0.1.0' }))).toBe('offline');
  });

  it('is offline when the request fails', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await settle(failing)).toBe('offline');
  });
});
