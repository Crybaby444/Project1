import { LOCALES } from '@yoyo/shared';
import type { MetadataRoute } from 'next';
import { localizedPath } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

/** Screens that only make sense for one person (or for us): not for search results. */
const PRIVATE = ['/settings', '/styleguide'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...PRIVATE.flatMap((path) => LOCALES.map((locale) => localizedPath(locale, path)))],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
