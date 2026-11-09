import type { CategoryNode } from '@yoyo/shared';

const LOCALES = ['en', 'lv', 'ru'] as const;

/**
 * Whether the tree has what this site reads from it: a name and an address in every language, on
 * every root and subcategory. Vercel goes live before Render: for a few minutes after a release the
 * API (or a cached answer of it) can be one version behind, and a missing field must cost the menu,
 * not every page.
 */
export function isCurrentTree(tree: unknown): tree is CategoryNode[] {
  const nodeOk = (node: unknown): boolean => {
    if (typeof node !== 'object' || node === null) return false;
    const { slugs, names, children } = node as Partial<Record<'slugs' | 'names' | 'children', unknown>>;
    const text = (value: unknown) =>
      typeof value === 'object' && value !== null && LOCALES.every((l) => typeof (value as Record<string, unknown>)[l] === 'string');
    return text(slugs) && text(names) && (children === undefined || (Array.isArray(children) && children.every(nodeOk)));
  };
  return Array.isArray(tree) && tree.every(nodeOk);
}
