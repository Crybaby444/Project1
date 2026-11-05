import { LOCALES } from '@yoyo/shared';
import type { MetadataRoute } from 'next';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/types';
import { alternates } from '@/lib/seo';
import { PAGES } from '@/lib/site';

/** Every public page in every language, each listing the same page in the other languages. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) =>
    LOCALES.map((locale) => {
      const links = alternates(path, locale);
      return {
        url: links.canonical,
        lastModified: LEGAL_EFFECTIVE_DATE,
        changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
        priority: path === '/' ? 1 : 0.6,
        alternates: { languages: links.languages },
      };
    }),
  );
}
