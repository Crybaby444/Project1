import { siteOrigin } from '@/lib/seo';
import { sitemapIndex, xmlResponse } from '@/lib/sitemaps';

export const dynamic = 'force-dynamic';

/** The sitemap index: the site's pages, the categories and the items (W03 §J). */
export function GET() {
  return xmlResponse(sitemapIndex(siteOrigin()));
}
