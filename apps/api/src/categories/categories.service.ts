import { Injectable } from '@nestjs/common';
import type { AttributeDef, CategoryNode, LocalizedText, StickerColor } from '@yoyo/shared';
import type { Category, CategoryAttribute } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export function toAttributeDef(attribute: CategoryAttribute): AttributeDef {
  return {
    key: attribute.key,
    type: attribute.type,
    required: attribute.required,
    unit: attribute.unit,
    labels: attribute.labels as LocalizedText,
    options: (attribute.options as AttributeDef['options']) ?? null,
  };
}

/** An active category a listing may point at, with what the builder asks for in it. */
export interface CategoryForListing {
  id: string;
  /** Only a leaf (no active subcategories) takes listings that go to review. */
  leaf: boolean;
  attributes: AttributeDef[];
}

type CategoryRow = Category & { attributes: CategoryAttribute[] };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active categories as a tree, in catalog order. A category under an inactive parent is left out too. */
  async tree(): Promise<CategoryNode[]> {
    const rows: CategoryRow[] = await this.prisma.category.findMany({
      where: { active: true },
      include: { attributes: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });
    const byParent = new Map<string | null, CategoryRow[]>();
    for (const row of rows) byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
    const build = (parentId: string | null): CategoryNode[] =>
      (byParent.get(parentId) ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        sticker: row.sticker as StickerColor,
        icon: row.icon,
        names: row.names as LocalizedText,
        slugs: row.slugs as LocalizedText,
        attributes: row.attributes.map(toAttributeDef),
        children: build(row.id),
      }));
    return build(null);
  }

  /** The active category with this id (its whole parent chain active too), or null. */
  async forListing(id: string): Promise<CategoryForListing | null> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { attributes: { orderBy: { sortOrder: 'asc' } }, children: { where: { active: true }, select: { id: true } } },
    });
    if (!category || !category.active) return null;
    let parentId = category.parentId;
    while (parentId !== null) {
      const parent = await this.prisma.category.findUnique({ where: { id: parentId }, select: { active: true, parentId: true } });
      if (!parent?.active) return null;
      parentId = parent.parentId;
    }
    return { id: category.id, leaf: category.children.length === 0, attributes: category.attributes.map(toAttributeDef) };
  }
}
