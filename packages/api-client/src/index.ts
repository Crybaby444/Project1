import createClient, { type Client, type ClientOptions } from 'openapi-fetch';
import type { paths } from './schema';

export type { components, paths } from './schema';

export type ApiClient = Client<paths>;

/**
 * Typed client for the Yoyo API.
 * `baseUrl` is the API origin (e.g. http://localhost:4000): generated paths already start with /api/v1.
 */
export function createApiClient(baseUrl: string, options: Omit<ClientOptions, 'baseUrl'> = {}): ApiClient {
  return createClient<paths>({ ...options, baseUrl: baseUrl.replace(/\/+$/, '') });
}
