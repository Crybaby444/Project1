import { loadSitemap } from '@/lib/catalog/server-api';
import { siteOrigin } from '@/lib/seo';
import { listingUrls, urlset, xmlResponse } from '@/lib/sitemaps';

export const dynamic = 'force-dynamic';

/** Every item in the catalog at its canonical address; 503 while the API is away. */
export async function GET() {
  const loaded = await loadSitemap();
  if (!loaded.ok) return xmlResponse(urlset([]), 503);
  return xmlResponse(urlset(listingUrls(siteOrigin(), loaded.data.listings)));
}
