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

/**
 * Up to `perRoot` cover thumbnails for each root category, from items newest first: a peek at what each
 * part of the catalog holds (the catalog's index shows them beside the names).
 */
export function coversByRoot(
  tree: CategoryNode[],
  items: readonly { categoryId: string | null; cover: { thumb: string } | null }[],
  perRoot = 3,
): Record<string, string[]> {
  const rootOf = new Map<string, string>();
  for (const root of tree) for (const node of allCategories([root])) rootOf.set(node.id, root.id);
  const covers: Record<string, string[]> = {};
  for (const item of items) {
    const root = item.categoryId ? rootOf.get(item.categoryId) : undefined;
    if (!root || !item.cover) continue;
    const list = (covers[root] ??= []);
    if (list.length < perRoot && !list.includes(item.cover.thumb)) list.push(item.cover.thumb);
  }
  return covers;
}
