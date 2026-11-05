import type { CategoryNode, LocalizedText } from '@yoyo/shared';

/** The categories from the top of the tree down to `id` (empty when there is no such category). */
export function findPath(tree: CategoryNode[], id: string | null | undefined): CategoryNode[] {
  if (!id) return [];
  for (const node of tree) {
    if (node.id === id) return [node];
    const below = findPath(node.children, id);
    if (below.length > 0) return [node, ...below];
  }
  return [];
}

export function findCategory(tree: CategoryNode[], id: string | null | undefined): CategoryNode | undefined {
  return findPath(tree, id).at(-1);
}

/** Only a category without subcategories takes listings. */
export function isLeaf(node: CategoryNode): boolean {
  return node.children.length === 0;
}

/** A text of the API (category names, attribute labels) in the page language, English otherwise. */
export function localized(text: LocalizedText, locale: string): string {
  return (text as Record<string, string>)[locale] ?? text.en;
}
