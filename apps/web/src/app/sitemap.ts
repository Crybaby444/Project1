import { LOCALES } from '@yoyo/shared';
import type { MetadataRoute } from 'next';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/types';
import { localizedUrl } from '@/lib/seo';
import { PAGES } from '@/lib/site';

/**
 * Every public page in every language. The language alternates (hreflang) are not repeated here:
 * each page sends them in its Link header (the proxy) and in its <head>, one source of truth.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: localizedUrl(path, locale),
      lastModified: LEGAL_EFFECTIVE_DATE,
      changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '/' ? 1 : 0.6,
    })),
  );
}
