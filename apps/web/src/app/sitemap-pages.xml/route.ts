import { siteOrigin } from '@/lib/seo';
import { pageUrls, urlset, xmlResponse } from '@/lib/sitemaps';

export function GET() {
  return xmlResponse(urlset(pageUrls(siteOrigin())));
}
