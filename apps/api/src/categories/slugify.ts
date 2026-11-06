import type { LocalizedText } from '@yoyo/shared';
import type { CatalogCategory } from './catalog-data';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Every category's address on each language's site, by its stable `slug` (W03 §D): English is the
 * key itself, Latvian and Russian come from the catalog data. Throws when a slug is not plain
 * lowercase ASCII or two categories share one on a language: an address leads to exactly one category.
 */
export function localizedSlugs(tree: Pick<CatalogCategory, 'slug' | 'slugs' | 'children'>[]): Map<string, LocalizedText> {
  const result = new Map<string, LocalizedText>();
  const taken = { en: new Map<string, string>(), lv: new Map<string, string>(), ru: new Map<string, string>() };
  const walk = (nodes: Pick<CatalogCategory, 'slug' | 'slugs' | 'children'>[]) => {
    for (const node of nodes) {
      const slugs: LocalizedText = { en: node.slug, lv: node.slugs.lv, ru: node.slugs.ru };
      for (const locale of ['en', 'lv', 'ru'] as const) {
        const slug = slugs[locale];
        if (!SLUG.test(slug)) throw new Error(`Category slug "${slug}" (${locale}) of ${node.slug} is not lowercase ASCII`);
        const owner = taken[locale].get(slug);
        if (owner !== undefined) throw new Error(`Category slug "${slug}" (${locale}) of ${node.slug} is already used by ${owner}`);
        taken[locale].set(slug, node.slug);
      }
      result.set(node.slug, slugs);
      walk(node.children ?? []);
    }
  };
  walk(tree);
  return result;
}
