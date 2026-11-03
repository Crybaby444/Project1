import { describe, expect, it } from 'vitest';
import { createApiClient } from './index';

const healthBody = { status: 'ok', db: 'up', version: '0.1.0' };

function recordingFetch(seen: string[]): typeof fetch {
  return (async (input: Request) => {
    seen.push(input.url);
    return new Response(JSON.stringify(healthBody), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('createApiClient', () => {
  it('requests generated paths relative to the API origin and returns the JSON body', async () => {
    const seen: string[] = [];
    const api = createApiClient('http://api.test', { fetch: recordingFetch(seen) });

    const { data, response } = await api.GET('/api/v1/health');

    expect(seen).toEqual(['http://api.test/api/v1/health']);
    expect(response.status).toBe(200);
    expect(data).toEqual(healthBody);
  });

  it('does not double the slash when the base URL ends with one', async () => {
    const seen: string[] = [];
    const api = createApiClient('http://api.test/', { fetch: recordingFetch(seen) });

    await api.GET('/api/v1/health');

    expect(seen).toEqual(['http://api.test/api/v1/health']);
  });
});
