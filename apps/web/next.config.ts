import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { resolveApiUrl } from './src/lib/api-url';

// Fail a production build early and clearly when the API address is missing.
resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The site and the API share one origin: src/proxy.ts proxies /api/* to the API (with PROXY_SECRET).
};

export default withNextIntl(nextConfig);
