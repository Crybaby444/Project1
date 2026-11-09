import { LOCALES, type CategoryNode, type ItemAddress, type Locale } from '@yoyo/shared';
import { allCategories } from './catalog/categories';
import { categoryAlternates, categoryPath, classifyPath, linkHeader, localePath } from './seo';

/** Set by the proxy only (any incoming copy is dropped): the language of an item page's texts. */
export const CONTENT_LOCALE_HEADER = 'x-yoyo-content-locale';

/**
 * What the proxy does with a page before next-intl renders it (owner's SEO decision, W02 §F, W03 §G):
 * - item: 301 to the right `{id}-{slug}`; 410 for a removed item; no hreflang `Link`; the page's
 *   language for <html lang>;
 * - profile: no hreflang `Link`;
 * - category: 301 from another language's slug; `Link` with each language's own slug;
 * - anything else: next-intl's `Link` as it is.
 */
export type PageDecision =
  | { action: 'redirect'; location: string }
  | { action: 'gone'; locale: Locale }
  | { action: 'render'; link: 'keep' | 'drop' | string; contentLocale?: Locale };

export interface Lookups {
  address(id: string): Promise<{ status: 200; data: ItemAddress } | { status: number }>;
  categories(): Promise<CategoryNode[] | null>;
}

export async function decidePage(pathname: string, search: string, origin: string, lookups: Lookups): Promise<PageDecision> {
  const page = classifyPath(pathname);
  if (page.kind === 'listing') {
    const answer = await lookups.address(page.id);
    if (answer.status === 410) return { action: 'gone', locale: page.locale };
    if (answer.status !== 200 || !('data' in answer)) return { action: 'render', link: 'drop' };
    const { slug, contentLocale } = answer.data;
    if (page.slug !== slug) {
      return { action: 'redirect', location: `${localePath(page.locale, `/listings/${page.id}-${slug}`)}${search}` };
    }
    return { action: 'render', link: 'drop', contentLocale };
  }
  if (page.kind === 'profile') return { action: 'render', link: 'drop' };
  if (page.kind === 'category') {
    const tree = await lookups.categories();
    if (!tree) return { action: 'render', link: 'drop' };
    const all = allCategories(tree);
    const exact = all.find((node) => node.slugs[page.locale] === page.slug);
    if (exact) return { action: 'render', link: linkHeader(origin, categoryAlternates(exact.slugs)) };
    const other = all.find((node) => LOCALES.some((locale) => node.slugs[locale] === page.slug));
    if (other) return { action: 'redirect', location: `${localePath(page.locale, categoryPath(other.slugs[page.locale]))}${search}` };
    return { action: 'render', link: 'drop' };
  }
  return { action: 'render', link: 'keep' };
}

