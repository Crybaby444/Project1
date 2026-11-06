import { isDeepStrictEqual } from 'node:util';
import { Prisma, type CategoryAttribute, type PrismaClient } from '../generated/prisma/client';
import { CATALOG, type CatalogCategory } from './catalog-data';
import { localizedSlugs } from './slugify';

/** Key of the Postgres advisory lock that lets one instance at a time sync the catalog. */
const CATALOG_LOCK = 6_060_001;

type Tx = Prisma.TransactionClient;

interface ExistingCategory {
  id: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  sticker: string;
  icon: string;
  names: Prisma.JsonValue;
  slugs: Prisma.JsonValue;
  active: boolean;
}

async function syncAttributes(tx: Tx, categoryId: string, category: CatalogCategory, existing: CategoryAttribute[]): Promise<void> {
  const wanted = category.attributes ?? [];
  const byKey = new Map(existing.map((attribute) => [attribute.key, attribute]));
  for (const [sortOrder, attribute] of wanted.entries()) {
    const data = {
      type: attribute.type,
      required: attribute.required ?? false,
      unit: attribute.unit ?? null,
      labels: attribute.labels,
      options: attribute.options ?? Prisma.DbNull,
      sortOrder,
    };
    const current = byKey.get(attribute.key);
    if (!current) {
      await tx.categoryAttribute.create({ data: { categoryId, key: attribute.key, ...data } });
      continue;
    }
    const same =
      current.type === data.type &&
      current.required === data.required &&
      current.unit === data.unit &&
      current.sortOrder === sortOrder &&
      isDeepStrictEqual(current.labels, data.labels) &&
      isDeepStrictEqual(current.options, attribute.options ?? null);
    if (!same) await tx.categoryAttribute.update({ where: { id: current.id }, data });
  }
  const keep = new Set(wanted.map((attribute) => attribute.key));
  const gone = existing.filter((attribute) => !keep.has(attribute.key)).map((attribute) => attribute.id);
  if (gone.length > 0) await tx.categoryAttribute.deleteMany({ where: { id: { in: gone } } });
}

/**
 * Brings the Category and CategoryAttribute tables in line with `catalog` (CATALOG by default):
 * creates what is missing and updates what changed, matching categories by slug and attributes by
 * key. A category no longer in the catalog is deactivated (listings may point at it), not deleted; an
 * attribute no longer in its category is deleted. Runs on every API start. Rows that already match
 * are not written, so a normal start costs a few reads. Safe from several instances at once: a
 * transaction-scoped advisory lock lets one sync at a time.
 */
export async function ensureCategories(prisma: PrismaClient, catalog: CatalogCategory[] = CATALOG): Promise<void> {
  // Checked before anything is written: two categories on one address is a bug in the data.
  const slugsOf = localizedSlugs(catalog);
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CATALOG_LOCK})`;
      const existing: ExistingCategory[] = await tx.category.findMany();
      const bySlug = new Map(existing.map((category) => [category.slug, category]));
      const attributesOf = new Map<string, CategoryAttribute[]>();
      for (const attribute of await tx.categoryAttribute.findMany()) {
        attributesOf.set(attribute.categoryId, [...(attributesOf.get(attribute.categoryId) ?? []), attribute]);
      }
      const seen = new Set<string>();

      const sync = async (categories: CatalogCategory[], parentId: string | null): Promise<void> => {
        for (const [sortOrder, category] of categories.entries()) {
          seen.add(category.slug);
          const slugs = slugsOf.get(category.slug)!;
          const data = { parentId, sortOrder, sticker: category.sticker, icon: category.icon, names: category.names, slugs, active: true };
          const current = bySlug.get(category.slug);
          let id: string;
          if (!current) {
            id = (await tx.category.create({ data: { slug: category.slug, ...data } })).id;
          } else {
            id = current.id;
            const same =
              current.parentId === parentId &&
              current.sortOrder === sortOrder &&
              current.sticker === category.sticker &&
              current.icon === category.icon &&
              current.active &&
              isDeepStrictEqual(current.names, category.names) &&
              isDeepStrictEqual(current.slugs, slugs);
            if (!same) await tx.category.update({ where: { id }, data });
          }
          await syncAttributes(tx, id, category, attributesOf.get(id) ?? []);
          await sync(category.children ?? [], id);
        }
      };
      await sync(catalog, null);

      const retired = existing.filter((category) => category.active && !seen.has(category.slug)).map((category) => category.id);
      if (retired.length > 0) await tx.category.updateMany({ where: { id: { in: retired } }, data: { active: false } });
    },
    { maxWait: 30_000, timeout: 60_000 },
  );
}
