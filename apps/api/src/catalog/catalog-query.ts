import { addDays, diffDays, localDate, type LocalDate } from '@yoyo/domain';
import type { CatalogQuery, CatalogSort } from '@yoyo/shared';
import { Prisma } from '../generated/prisma/client';
import { CATALOG_VISIBLE_SQL } from './visibility';

/** What the query names that only the database or the category tree can resolve. */
export interface FilterContext {
  /** The category and all its subcategories, or null for no category filter. */
  categoryIds: string[] | null;
  /** Categories whose name matches the search text (their listings match too). */
  textCategoryIds: string[];
  /** Districts whose slug is the one asked for, or null for no district filter. */
  districts: string[] | null;
}

/** Visible listings with their owners: the FROM and the visibility rule of every catalog query. */
export const VISIBLE_FROM = Prisma.sql`FROM "Listing" l JOIN "User" u ON u."id" = l."ownerId"`;

/** `%` and `_` (and the escape itself) match themselves in LIKE. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Lowercase, no diacritics: the same folding `yoyo_fold` does in the database, for names held in code. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** The search text matches the title or description (substring, or a close word for typos) or the category. */
export function textMatchSql(q: string, textCategoryIds: string[]): Prisma.Sql {
  const like = `%${escapeLike(q)}%`;
  const byCategory = textCategoryIds.length > 0 ? Prisma.sql` OR l."categoryId" IN (${Prisma.join(textCategoryIds)})` : Prisma.empty;
  return Prisma.sql`(yoyo_fold(coalesce(l."title", '') || ' ' || coalesce(l."description", '')) LIKE yoyo_fold(${like}) ESCAPE '\\'
    OR yoyo_fold(${q}) <% yoyo_fold(l."title")${byCategory})`;
}

/** The WHERE of a catalog query: visibility, then every filter the query names, all as parameters. */
export function whereSql(query: CatalogQuery, ctx: FilterContext): Prisma.Sql {
  const parts: Prisma.Sql[] = [CATALOG_VISIBLE_SQL];
  if (query.q !== undefined) parts.push(textMatchSql(query.q, ctx.textCategoryIds));
  if (ctx.categoryIds !== null) {
    parts.push(ctx.categoryIds.length > 0 ? Prisma.sql`l."categoryId" IN (${Prisma.join(ctx.categoryIds)})` : Prisma.sql`FALSE`);
  }
  if (ctx.districts !== null) {
    parts.push(ctx.districts.length > 0 ? Prisma.sql`l."district" IN (${Prisma.join(ctx.districts)})` : Prisma.sql`FALSE`);
  }
  if (query.priceMin !== undefined) parts.push(Prisma.sql`l."dailyCents" >= ${query.priceMin}`);
  if (query.priceMax !== undefined) parts.push(Prisma.sql`l."dailyCents" <= ${query.priceMax}`);
  if (query.start !== undefined && query.end !== undefined) {
    const start = localDate(query.start);
    const end = localDate(query.end);
    const days = diffDays(start, end) + 1;
    const after: LocalDate = addDays(end, 1);
    // Free on every day: no reservation and no closed period touches [start, end]; and the item may
    // be rented for that many days at all.
    parts.push(Prisma.sql`l."minDays" <= ${days} AND l."maxDays" >= ${days}
      AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."listingId" = l."id" AND b."reserved" && daterange(${start}::date, ${after}::date, '[)'))
      AND NOT EXISTS (SELECT 1 FROM "Unavailability" n WHERE n."listingId" = l."id" AND n."start" <= ${end}::date AND n."end" >= ${start}::date)`);
  }
  return Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;
}

/** The sort a query gets: relevance only with a search text; newest first otherwise. */
export function effectiveSort(query: CatalogQuery): CatalogSort {
  if (query.sort === 'relevance') return query.q !== undefined ? 'relevance' : 'new';
  return query.sort ?? (query.q !== undefined ? 'relevance' : 'new');
}

/** ORDER BY with the id last, so pages never overlap or skip an item. */
export function orderSql(query: CatalogQuery): Prisma.Sql {
  switch (effectiveSort(query)) {
    case 'price_asc':
      return Prisma.sql`ORDER BY l."dailyCents" ASC, l."publishedAt" DESC, l."id" DESC`;
    case 'price_desc':
      return Prisma.sql`ORDER BY l."dailyCents" DESC, l."publishedAt" DESC, l."id" DESC`;
    case 'relevance':
      return Prisma.sql`ORDER BY word_similarity(yoyo_fold(${query.q ?? ''}), yoyo_fold(coalesce(l."title", ''))) DESC, l."publishedAt" DESC, l."id" DESC`;
    default:
      return Prisma.sql`ORDER BY l."publishedAt" DESC, l."id" DESC`;
  }
}
