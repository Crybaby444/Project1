/** One entry of Next.js `redirects()`. */
export interface HostRedirect {
  source: string;
  has: { type: 'host'; value: string }[];
  destination: string;
  permanent: boolean;
}

/** `has.value` is a regular expression in Next.js: match the host literally. */
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Permanent (308) redirects from legacy hosts (e.g. yoyo-rent.vercel.app) to the canonical site origin
 * (e.g. https://yoyo.rent), path and query kept. Both values come from server-only env vars read at
 * build time (SITE_ORIGIN, LEGACY_HOSTS = comma-separated hosts); when either is unset there are no
 * redirects, so preview deployments and local development are untouched.
 */
export function legacyHostRedirects(siteOrigin: string | undefined, legacyHosts: string | undefined): HostRedirect[] {
  const site = siteOrigin?.trim();
  const hosts = (legacyHosts ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!site || hosts.length === 0) return [];

  let origin: URL;
  try {
    origin = new URL(site);
  } catch {
    throw new Error(`SITE_ORIGIN must be an origin such as https://yoyo.rent, got "${site}"`);
  }
  if (origin.protocol !== 'https:' && origin.protocol !== 'http:') {
    throw new Error(`SITE_ORIGIN must be an http(s) origin such as https://yoyo.rent, got "${site}"`);
  }

  return [...new Set(hosts)]
    .filter((host) => host !== origin.host)
    .map((host) => ({
      source: '/:path*',
      has: [{ type: 'host', value: literal(host) }],
      destination: `${origin.origin}/:path*`,
      permanent: true,
    }));
}
