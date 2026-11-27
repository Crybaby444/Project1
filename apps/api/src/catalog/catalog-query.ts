import { addDays, diffDays, localDate, type LocalDate } from '@yoyo/domain';
import type { CatalogQuery, CatalogSort, CategoryNode } from '@yoyo/shared';
import { Prisma } from '../generated/prisma/client';
import { CATALOG_VISIBLE_SQL } from './visibility';

/** What the query names that only the database or the category tree can resolve. */
export interface FilterContext {
  /** The category and all its subcategories, or null for no category filter. */
  categoryIds: string[] | null;
  /** The words of the search text, each with the categories it names (their listings match that word too). */
  text: TextWord[];
  /** Districts whose slug is the one asked for, or null for no district filter. */
  districts: string[] | null;
  /** Cities whose slug is the one asked for, or null for no city filter. */
  cities: string[] | null;
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

/** One word of a search text: as typed (folded), its stem, and the categories it names. */
export interface TextWord {
  word: string;
  stem: string;
  categoryIds: string[];
}

/** Words of a search text, folded, without one- and two-letter words (и, в, a, of), at most eight. */
export function searchWords(q: string): string[] {
  return [...new Set(fold(q).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3))].slice(0, 8);
}

/**
 * The part of a folded word that stays through its endings, roughly and without a dictionary: Russian and
 * Latvian change the last letter or two (дрель → дрели, палатка → палатки, urbjmašīna → urbjmašīnas), English
 * adds them (drill → drills). Long words lose two letters, middling ones one, short ones none.
 */
export function stemOf(word: string): string {
  if (word.length >= 7) return word.slice(0, -2);
  if (word.length >= 5) return word.slice(0, -1);
  return word;
}

/** The attributes whose choices name the kinds of things a category holds ("City bike", "Горный велосипед"). */
const KIND_ATTRIBUTES = new Set(['type', 'model']);

/**
 * What a category answers to in a search, folded, in every language: its names and the kinds it holds (the
 * choices of its type or model, never "Other"). Items are often written in one language and searched in
 * another (owner, 2026-11-27: Riga reads Latvian and Russian); the category bridges them, so a Russian
 * «велосипед» finds a bike listed as «Velosipēds».
 */
export function vocabularyOf(node: CategoryNode): string[] {
  const words = [...Object.values(node.names)];
  for (const attribute of node.attributes) {
    if (!KIND_ATTRIBUTES.has(attribute.key)) continue;
    for (const option of attribute.options ?? []) if (option.value !== 'other') words.push(...Object.values(option.labels));
  }
  return words.map(fold);
}

/**
 * The words of a search text with their stems and the categories each names (by `vocabularyOf`, the whole
 * subtree of a named parent). A text of only short words is taken whole, as typed.
 */
export function textWords(q: string, categories: { ids: string[]; vocabulary: string[] }[]): TextWord[] {
  const words = searchWords(q);
  if (words.length === 0) return [{ word: fold(q), stem: fold(q), categoryIds: [] }];
  return words.map((word) => {
    const stem = stemOf(word);
    const named = categories.filter((category) => category.vocabulary.some((name) => name.includes(stem)));
    return { word, stem, categoryIds: [...new Set(named.flatMap((category) => category.ids))] };
  });
}

/**
 * Every word of the search text matches the item: its title or description holds the word's stem, its
 * title has a close word (a typo), or its category answers to the word.
 */
export function textMatchSql(words: TextWord[]): Prisma.Sql {
  return Prisma.join(
    words.map(({ word, stem, categoryIds }) => {
      const like = `%${escapeLike(stem)}%`;
      const byCategory = categoryIds.length > 0 ? Prisma.sql` OR l."categoryId" IN (${Prisma.join(categoryIds)})` : Prisma.empty;
      return Prisma.sql`(yoyo_fold(coalesce(l."title", '') || ' ' || coalesce(l."description", '')) LIKE yoyo_fold(${like}) ESCAPE '\\'
    OR yoyo_fold(${word}) <% yoyo_fold(l."title")${byCategory})`;
    }),
    ' AND ',
  );
}

/** The WHERE of a catalog query: visibility, then every filter the query names, all as parameters. */
export function whereSql(query: CatalogQuery, ctx: FilterContext): Prisma.Sql {
  const parts: Prisma.Sql[] = [CATALOG_VISIBLE_SQL];
  if (query.q !== undefined && ctx.text.length > 0) parts.push(textMatchSql(ctx.text));
  if (ctx.categoryIds !== null) {
    parts.push(ctx.categoryIds.length > 0 ? Prisma.sql`l."categoryId" IN (${Prisma.join(ctx.categoryIds)})` : Prisma.sql`FALSE`);
  }
  if (ctx.districts !== null) {
    parts.push(ctx.districts.length > 0 ? Prisma.sql`l."district" IN (${Prisma.join(ctx.districts)})` : Prisma.sql`FALSE`);
  }
  if (query.country !== undefined) parts.push(Prisma.sql`l."country" = ${query.country}`);
  if (ctx.cities !== null) {
    parts.push(ctx.cities.length > 0 ? Prisma.sql`l."city" IN (${Prisma.join(ctx.cities)})` : Prisma.sql`FALSE`);
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
