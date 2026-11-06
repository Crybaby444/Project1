import type { CategoryNode, LocalizedText, StickerColor } from '@yoyo/shared';

/** A root of the menu: its name, address and the first few subcategories. */
export type MenuRoot = {
  slugs: LocalizedText;
  names: LocalizedText;
  sticker: StickerColor;
  children: { slugs: LocalizedText; names: LocalizedText }[];
  /** Subcategories not shown in the menu. */
  more: number;
};

/** Subcategories shown under each root. */
const SHOWN = 3;

/** What the header needs of the category tree: small enough to send with every page. */
export function menuRoots(tree: CategoryNode[]): MenuRoot[] {
  return tree.map((root) => ({
    slugs: root.slugs,
    names: root.names,
    sticker: root.sticker,
    children: root.children.slice(0, SHOWN).map((child) => ({ slugs: child.slugs, names: child.names })),
    more: Math.max(0, root.children.length - SHOWN),
  }));
}
