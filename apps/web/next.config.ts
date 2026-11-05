import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { resolveApiUrl } from './src/lib/api-url';
import { legacyHostRedirects } from './src/lib/legacy-redirects';

// Fail a production build early and clearly when the API address is missing.
resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The whole stylesheet is ~11 KB compressed: inline it, so the first paint does not wait for a
  // render-blocking request (Lighthouse mobile: home median 88 → 91).
  experimental: { inlineCss: true },
  // The site and the API share one origin: src/proxy.ts proxies /api/* to the API (with PROXY_SECRET).
  // Old addresses (LEGACY_HOSTS) move permanently to the site's own domain (SITE_ORIGIN). Both are
  // server-only and read at build time; unset (previews, local) means no redirects.
  async redirects() {
    return legacyHostRedirects(process.env.SITE_ORIGIN, process.env.LEGACY_HOSTS);
  },
};

export default withNextIntl(nextConfig);
