import { createApiClient } from '@yoyo/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useApiHealth } from './use-api-health';

function clientAnswering(status: number, body: unknown) {
  const fetch = (async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as typeof globalThis.fetch;
  return createApiClient('http://api.test', { fetch });
}

function clientFailingWith(error: Error) {
  const fetch = (async () => {
    throw error;
  }) as typeof globalThis.fetch;
  return createApiClient('http://api.test', { fetch });
}

describe('useApiHealth', () => {
  it('starts as checking and becomes online when the API and database are up', async () => {
    const { result } = renderHook(() => useApiHealth(clientAnswering(200, { status: 'ok', db: 'up', version: '0.1.0' })));
    expect(result.current).toBe('checking');
    await waitFor(() => expect(result.current).toBe('online'));
  });

  it('is offline when the API reports a degraded database', async () => {
    const { result } = renderHook(() =>
      useApiHealth(clientAnswering(503, { status: 'degraded', db: 'down', version: '0.1.0' })),
    );
    await waitFor(() => expect(result.current).toBe('offline'));
  });

  it('is offline when the API cannot be reached at all', async () => {
    const { result } = renderHook(() => useApiHealth(clientFailingWith(new TypeError('Failed to fetch'))));
    await waitFor(() => expect(result.current).toBe('offline'));
  });

  it('is offline for a 200 whose body is not a healthy status', async () => {
    const { result } = renderHook(() => useApiHealth(clientAnswering(200, { status: 'degraded', db: 'down', version: '0.1.0' })));
    await waitFor(() => expect(result.current).toBe('offline'));
  });
});
