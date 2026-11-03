import createClient, { type Client } from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type { components, paths };

export type ApiClient = Client<paths>;

/** Typed client for the Yoyo API. `baseUrl` is the server origin, e.g. `http://localhost:4000`. */
export function createApiClient(baseUrl: string, init: { fetch?: typeof fetch } = {}): ApiClient {
  return createClient<paths>({ baseUrl: baseUrl.replace(/\/+$/, ''), credentials: 'include', ...init });
}
