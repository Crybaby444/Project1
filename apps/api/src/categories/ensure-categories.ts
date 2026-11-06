import { isDeepStrictEqual } from 'node:util';
import { validateAttributes, type AttributeDef } from '@yoyo/shared';
import { Prisma, type CategoryAttribute, type PrismaClient } from '../generated/prisma/client';
import { toAttributeDef } from './categories.service';
import { CATALOG, CATALOG_VERSION, LEGACY_CATEGORIES, type CatalogCategory } from './catalog-data';
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

/** The Setting row that remembers which catalog version's listing moves already ran. */
export const CATALOG_VERSION_SETTING = 'catalog.version';

/** The attribute values a listing keeps in another category: only keys it defines, with valid values. */
export function keepKnownAttributes(values: Prisma.JsonValue, defs: AttributeDef[]): Record<string, string | number | boolean> {
  const kept: Record<string, string | number | boolean> = {};
  if (values === null || typeof values !== 'object' || Array.isArray(values)) return kept;
  for (const [key, value] of Object.entries(values)) {
    const def = defs.find((candidate) => candidate.key === key);
    if (!def) continue;
    const checked = validateAttributes({ [key]: value }, [def], 'draft');
    if (checked.ok && checked.value[key] !== undefined) kept[key] = checked.value[key]!;
  }
  return kept;
}

export interface CatalogMigration {
  /** Old category slug → new category slug; their listings move. */
  legacy: Readonly<Record<string, string>>;
  /** The moves run once per version (remembered in the Setting table). */
  version: string;
}

/**
 * Moves the listings of categories that left the tree (or stopped taking listings) to their
 * replacement, once per catalog version. Nothing is deleted: a listing is never left without a category.
 */
async function moveLegacyListings(tx: Tx, migration: CatalogMigration): Promise<void> {
  const stored = await tx.setting.findUnique({ where: { key: CATALOG_VERSION_SETTING } });
  if (stored?.value === migration.version) return;
  const categories = await tx.category.findMany({ include: { attributes: { orderBy: { sortOrder: 'asc' } } } });
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  for (const [from, to] of Object.entries(migration.legacy)) {
    const source = bySlug.get(from);
    const target = bySlug.get(to);
    if (!source || !target) continue;
    const defs = target.attributes.map(toAttributeDef);
    const listings = await tx.listing.findMany({ where: { categoryId: source.id }, select: { id: true, attributes: true } });
    for (const listing of listings) {
      await tx.listing.update({
        where: { id: listing.id },
        // A new version: an open builder tab sees the change instead of overwriting it.
        data: { categoryId: target.id, attributes: keepKnownAttributes(listing.attributes, defs), version: { increment: 1 } },
      });
    }
  }
  await tx.setting.upsert({
    where: { key: CATALOG_VERSION_SETTING },
    create: { key: CATALOG_VERSION_SETTING, value: migration.version },
    update: { value: migration.version },
  });
}

/**
 * Brings the Category and CategoryAttribute tables in line with `catalog` (CATALOG by default), then
 * moves listings of replaced categories (LEGACY_CATEGORIES, once per CATALOG_VERSION):
 * creates what is missing and updates what changed, matching categories by slug and attributes by
 * key. A category no longer in the catalog is deactivated (listings may point at it), not deleted; an
 * attribute no longer in its category is deleted. Runs on every API start. Rows that already match
 * are not written, so a normal start costs a few reads. Safe from several instances at once: a
 * transaction-scoped advisory lock lets one sync at a time.
 */
export async function ensureCategories(
  prisma: PrismaClient,
  catalog: CatalogCategory[] = CATALOG,
  migration: CatalogMigration = { legacy: LEGACY_CATEGORIES, version: CATALOG_VERSION },
): Promise<void> {
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
      await moveLegacyListings(tx, migration);

      const retired = existing.filter((category) => category.active && !seen.has(category.slug)).map((category) => category.id);
      if (retired.length > 0) await tx.category.updateMany({ where: { id: { in: retired } }, data: { active: false } });
    },
    { maxWait: 30_000, timeout: 60_000 },
  );
}
