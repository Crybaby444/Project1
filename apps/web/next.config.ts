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
  experimental: {
    // inlineCss is off (SEO audit 2026-11-16): the stylesheet grew to ~130 KB and was inlined four times
    // per page (a <style> and three copies in the RSC payload): 790 KB of HTML for the home. One cached
    // stylesheet request is lighter for every page after the first.
    // Listing photos go through the /api proxy (src/proxy.ts), which buffers request bodies up to this
    // size. The API's own limit is 10 MB a photo; leave room for the multipart envelope around it.
    proxyClientMaxBodySize: '11mb',
  },
  // The site and the API share one origin: src/proxy.ts proxies /api/* to the API (with PROXY_SECRET).
  // Old addresses (LEGACY_HOSTS) move permanently to the site's own domain (SITE_ORIGIN). Both are
  // server-only and read at build time; unset (previews, local) means no redirects.
  // Security headers every page sends (SEO audit 2026-11-16: none of these were set). Framing is limited to
  // the site itself; HSTS covers subdomains.
  async headers() {
    return [
      {
        // The service worker is always fetched fresh, and may control the whole site.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
        ],
      },
    ];
  },
  async redirects() {
    return legacyHostRedirects(process.env.SITE_ORIGIN, process.env.LEGACY_HOSTS);
  },
};

export default withNextIntl(nextConfig);
