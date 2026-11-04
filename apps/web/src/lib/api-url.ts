const LOCAL_API = 'http://localhost:4000';

/**
 * The API origin (generated client paths already start with /api/v1).
 * Development and tests fall back to the local API; a production build without
 * NEXT_PUBLIC_API_URL fails loudly instead of shipping a site that silently calls localhost.
 *
 * Call it with the literal `process.env.NEXT_PUBLIC_API_URL` / `process.env.NODE_ENV`
 * so Next.js can inline them into browser bundles.
 */
export function resolveApiUrl(configured: string | undefined, nodeEnv: string | undefined): string {
  const value = configured?.trim();
  if (value) return value;
  if (nodeEnv === 'production') {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. A production build needs the API origin, e.g. https://yoyo-api.onrender.com',
    );
  }
  return LOCAL_API;
}

/**
 * Where the typed client sends requests. In the browser: the site's own origin (`''`), whose /api/*
 * Next.js proxies to the API, so the session cookies are first-party. On the server: the API itself.
 */
export function apiBaseUrl(isBrowser: boolean, configured: string | undefined, nodeEnv: string | undefined): string {
  return isBrowser ? '' : resolveApiUrl(configured, nodeEnv);
}

/** Next.js rewrites: every /api path of the site goes to the same path on the API, before pages match. */
export function apiRewrites(apiOrigin: string): { beforeFiles: { source: string; destination: string }[] } {
  return { beforeFiles: [{ source: '/api/:path*', destination: `${apiOrigin.replace(/\/+$/, '')}/api/:path*` }] };
}
