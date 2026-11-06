import { loadSitemap } from '@/lib/catalog/server-api';
import { siteOrigin } from '@/lib/seo';
import { categoryUrls, urlset, xmlResponse } from '@/lib/sitemaps';

export const dynamic = 'force-dynamic';

/** Categories with at least 3 items, in every language; 503 while the API is away (crawlers come back). */
export async function GET() {
  const loaded = await loadSitemap();
  if (!loaded.ok) return xmlResponse(urlset([]), 503);
  return xmlResponse(urlset(categoryUrls(siteOrigin(), loaded.data.categories)));
}
