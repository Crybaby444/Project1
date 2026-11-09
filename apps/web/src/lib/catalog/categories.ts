import type { CategoryNode, Locale } from '@yoyo/shared';
import { localized } from '@/lib/listings/categories';
import { categoryPath, localePath } from '@/lib/seo';

/** Every category, depth first. */
export function allCategories(tree: CategoryNode[]): CategoryNode[] {
  return tree.flatMap((node) => [node, ...allCategories(node.children)]);
}

/** The categories from the root down to the one with this stable key (empty when there is none). */
export function pathTo(tree: CategoryNode[], key: string | null | undefined): CategoryNode[] {
  if (!key) return [];
  for (const node of tree) {
    if (node.slug === key || node.id === key) return [node];
    const below = pathTo(node.children, key);
    if (below.length > 0) return [node, ...below];
  }
  return [];
}

/**
 * The category a page address names: by the slug of the page's language; a slug of another language
 * is found too, so the page can send the visitor to the right address.
 */
export function findBySlug(tree: CategoryNode[], locale: Locale, slug: string): { node: CategoryNode; exact: boolean } | null {
  const all = allCategories(tree);
  const exact = all.find((node) => node.slugs[locale] === slug);
  if (exact) return { node: exact, exact: true };
  const other = all.find((node) => Object.values(node.slugs).includes(slug));
  return other ? { node: other, exact: false } : null;
}

/** The category's page in a language, with the locale prefix (for plain <a> links). */
export function categoryHref(node: CategoryNode, locale: Locale): string {
  return localePath(locale, categoryPath(node.slugs[locale]));
}

/** The category's page without the locale prefix (for the locale-aware Link). */
export function categoryLink(node: CategoryNode, locale: Locale): string {
  return categoryPath(node.slugs[locale]);
}

export function categoryName(node: CategoryNode, locale: string): string {
  return localized(node.names, locale);
}
