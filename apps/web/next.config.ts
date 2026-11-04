import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { apiRewrites, resolveApiUrl } from './src/lib/api-url';

// Fail a production build early and clearly when the API address is missing.
const apiUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The site and the API share one origin: /api/* is proxied to the API (src/proxy.ts leaves /api alone).
  async rewrites() {
    return apiRewrites(apiUrl);
  },
};

export default withNextIntl(nextConfig);
