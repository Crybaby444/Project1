import { Prisma } from '../generated/prisma/client';
import { CityDirectory } from './city-directory';
import { publicName } from '../common/public-name';
import { Inject, Injectable } from '@nestjs/common';
import { addDays, compareDates, localDateIn, type LocalDate } from '@yoyo/domain';
import {
  CATALOG_MAP_LIMIT,
  CATALOG_PAGE_SIZE,
  listingSlug,
  slugify,
  type CatalogItem,
  type CatalogPage,
  type CatalogQuery,
  type CategoryNode,
  type ItemAddress,
  type ItemDetail,
  type Locale,
  type MapResponse,
  type OwnerSummary,
  type PlacesResponse,
  type SitemapResponse,
  type SuggestResponse,
} from '@yoyo/shared';
import { blockedPeriods } from '../bookings/listing-access';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { CategoriesService } from '../categories/categories.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { User } from '../generated/prisma/client';
import { serializeListing, type UrlFor } from '../listings/listing.serializer';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { ReviewsService } from '../reviews/reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { fold, orderSql, searchWords, stemOf, textMatchSql, textWords, VISIBLE_FROM, vocabularyOf, whereSql, type FilterContext } from './catalog-query';
import { serializeCatalogItem } from './catalog.serializer';
import { rankForYou } from './for-you';
import { CATALOG_VISIBLE_SQL, CATALOG_VISIBLE_WHERE, catalogState } from './visibility';
import type { CategoryCounts, ForYouResponse } from '@yoyo/shared';

/** Owners and rentals are counted in the item's own zone; every listing is in Riga for now. */
const CATALOG_TIME_ZONE = 'Europe/Riga';

const notFound = () => new AppError('NOT_FOUND', 404, 'Listing not found');
const gone = () => new AppError('LISTING_GONE', 410, 'Listing removed');

/** Every category below `node`, itself included. */
function subtree(node: CategoryNode): CategoryNode[] {
  return [node, ...node.children.flatMap(subtree)];
}

/** Every category (flattened) as the search sees it: the ids it stands for and what it answers to. */
function searchable(all: CategoryNode[]): { ids: string[]; vocabulary: string[] }[] {
  return all.map((node) => ({ ids: subtree(node).map((below) => below.id), vocabulary: vocabularyOf(node) }));
}

/** The catalog: search, map, suggestions, the item page and the sitemap. Everything here is public. */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly rules: BookingRulesService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly reviews: ReviewsService,
    private readonly directory: CityDirectory,
  ) {}

  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  private today(): LocalDate {
    return localDateIn(this.clock.now(), CATALOG_TIME_ZONE);
  }

  /** Visible items per category (leaf ids; the site adds them up for the parents). */
  async categoryCounts(): Promise<CategoryCounts> {
    const rows = await this.prisma.$queryRaw<{ id: string; n: number }[]>`
      SELECT l."categoryId" AS id, count(*)::int AS n ${VISIBLE_FROM} WHERE ${CATALOG_VISIBLE_SQL} AND l."categoryId" IS NOT NULL GROUP BY l."categoryId"`;
    return { counts: Object.fromEntries(rows.map((r) => [r.id, r.n])) };
  }

  /** Whether a visible item matches a catalog query: the same filters the search uses (saved searches). */
  async matches(query: CatalogQuery, listingId: string): Promise<boolean> {
    const where = whereSql(query, await this.context(query));
    const [row] = await this.prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n ${VISIBLE_FROM} ${where} AND l."id" = ${listingId}`;
    return (row?.n ?? 0) > 0;
  }

  async search(query: CatalogQuery): Promise<CatalogPage> {
    const where = whereSql(query, await this.context(query));
    const offset = (query.page - 1) * CATALOG_PAGE_SIZE;
    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`SELECT l."id" ${VISIBLE_FROM} ${where} ${orderSql(query)} LIMIT ${CATALOG_PAGE_SIZE} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${VISIBLE_FROM} ${where}`,
    ]);
    return {
      items: await this.items(rows.map((row) => row.id)),
      total: counted[0]?.total ?? 0,
      page: query.page,
      pageSize: CATALOG_PAGE_SIZE,
    };
  }

  /**
   * The search on a map: items grouped into cells of a 0.01° grid, each pin at the middle of its cell.
   * The exact point never leaves the database.
   */
  async map(query: CatalogQuery): Promise<MapResponse> {
    const where = whereSql(query, await this.context(query));
    const [cells, counted] = await Promise.all([
      this.prisma.$queryRaw<{ lat: number; lng: number; count: number; ids: string[] }[]>`
        SELECT (floor(f."lat" * 100) / 100 + 0.005)::float8 AS lat, (floor(f."lng" * 100) / 100 + 0.005)::float8 AS lng,
               count(*)::int AS count, (array_agg(f."id" ORDER BY f."dailyCents", f."id"))[1:5] AS ids
        FROM (SELECT l."id", l."lat", l."lng", l."dailyCents" ${VISIBLE_FROM} ${where} AND l."lat" IS NOT NULL AND l."lng" IS NOT NULL
              ${orderSql(query)} LIMIT ${CATALOG_MAP_LIMIT}) f
        GROUP BY 1, 2`,
      this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${VISIBLE_FROM} ${where}`,
    ]);
    const items = new Map((await this.items(cells.flatMap((cell) => cell.ids))).map((item) => [item.id, item]));
    const total = counted[0]?.total ?? 0;
    return {
      pins: cells.map((cell) => ({
        lat: Math.round(cell.lat * 1000) / 1000,
        lng: Math.round(cell.lng * 1000) / 1000,
        count: cell.count,
        items: cell.ids.flatMap((id) => {
          const item = items.get(id);
          return item ? [{ id, title: item.title, dailyCents: item.dailyCents, cover: item.cover }] : [];
        }),
      })),
      total,
      truncated: total > CATALOG_MAP_LIMIT,
    };
  }

  /** Up to 3 categories (by their name in any language, `lang` first) and 5 items (by title). */
  async suggest(q: string, lang: Locale): Promise<SuggestResponse> {
    const tree = await this.categories.tree();
    const all = tree.flatMap(subtree);
    const words = searchWords(q);
    const stems = words.length > 0 ? words.map(stemOf) : [fold(q)];
    // Every word must name the category (by its names or the kinds it holds); its own names rank first,
    // a name that starts with the first word before one that has it inside, the page's language first.
    const score = (node: CategoryNode) => {
      const vocabulary = vocabularyOf(node);
      if (!stems.every((stem) => vocabulary.some((name) => name.includes(stem)))) return -1;
      const names = [node.names[lang], node.names.en, node.names.lv, node.names.ru].map(fold);
      const at = names.findIndex((name) => name.includes(stems[0]!));
      if (at === -1) return 20;
      return (names[at]!.startsWith(stems[0]!) ? 0 : 10) + (at === 0 ? 0 : 1);
    };
    const categories = all
      .map((node) => ({ node, rank: score(node) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(({ node }) => ({ slug: node.slug, slugs: node.slugs, names: node.names, sticker: node.sticker }));
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT l."id" ${VISIBLE_FROM} WHERE ${CATALOG_VISIBLE_SQL} AND ${textMatchSql(textWords(q, searchable(all)))}
      ORDER BY word_similarity(yoyo_fold(${q}), yoyo_fold(coalesce(l."title", ''))) DESC, l."publishedAt" DESC, l."id" DESC
      LIMIT 5`;
    const listings = (await this.items(rows.map((row) => row.id))).map((item) => ({ id: item.id, title: item.title, cover: item.cover }));
    return { categories, listings };
  }

  /**
   * Where there are items: countries (most first), and in the asked country (or everywhere) its cities
   * and districts, most items first; names that read the same as a slug are counted together.
   */
  async places(country?: string): Promise<PlacesResponse> {
    const inCountry = country ? Prisma.sql`AND l."country" = ${country}` : Prisma.empty;
    const [countryRows, cityRows, districtRows] = await Promise.all([
      this.prisma.$queryRaw<{ country: string; count: number }[]>`
        SELECT l."country" AS country, count(*)::int AS count ${VISIBLE_FROM}
        WHERE ${CATALOG_VISIBLE_SQL} AND l."country" IS NOT NULL GROUP BY l."country" ORDER BY count(*) DESC, l."country"`,
      this.prisma.$queryRaw<{ name: string; count: number }[]>`
        SELECT l."city" AS name, count(*)::int AS count ${VISIBLE_FROM}
        WHERE ${CATALOG_VISIBLE_SQL} AND l."city" IS NOT NULL ${inCountry} GROUP BY l."city"`,
      this.prisma.$queryRaw<{ name: string; count: number }[]>`
        SELECT l."district" AS name, count(*)::int AS count ${VISIBLE_FROM}
        WHERE ${CATALOG_VISIBLE_SQL} AND l."district" IS NOT NULL ${inCountry} GROUP BY l."district"`,
    ]);
    const bySlug = (rows: { name: string; count: number }[]) => {
      const merged = new Map<string, { name: string; slug: string; count: number }>();
      for (const row of rows) {
        const slug = slugify(row.name);
        if (slug === '') continue;
        const known = merged.get(slug);
        if (known) known.count += row.count;
        else merged.set(slug, { name: row.name, slug, count: row.count });
      }
      return [...merged.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    };
    return {
      countries: countryRows,
      cities: bySlug(cityRows).map(({ name, slug, count }) => ({ city: name, slug, count })),
      districts: bySlug(districtRows).map(({ name, slug, count }) => ({ district: name, slug, count })),
    };
  }

  /** Where the page of an item lives, or why it does not (W03 §G): 404 never public, 410 removed. */
  async address(id: string): Promise<ItemAddress> {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: { owner: true } });
    const state = catalogState(listing);
    if (state === 'missing') throw notFound();
    if (state === 'gone') throw gone();
    return { slug: listingSlug(listing!.title), contentLocale: listing!.contentLocale as Locale, available: state === 'available' };
  }

  async item(id: string): Promise<ItemDetail> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { owner: true, photos: true, unavailability: true },
    });
    const state = catalogState(listing);
    if (state === 'missing') throw notFound();
    if (state === 'gone') throw gone();
    const found = listing!;
    if (state === 'away') {
      return {
        available: false,
        listing: { id: found.id, title: found.title ?? '', categoryId: found.categoryId, contentLocale: found.contentLocale as Locale },
      };
    }
    const today = localDateIn(this.clock.now(), found.timeZone);
    const [settings, blocked, owner, ratings] = await Promise.all([
      this.rules.settings(),
      blockedPeriods(this.prisma, found.id),
      this.ownerSummary(found.owner),
      this.reviews.ratingsOfListings([found.id]),
    ]);
    const rating = ratings.get(found.id) ?? { rating: null, reviewCount: 0 };
    return {
      available: true,
      demo: found.demo,
      listing: serializeListing(found, 'public', this.urlFor),
      owner,
      rating: rating.rating,
      reviewCount: rating.reviewCount,
      blocked: blocked.filter((p) => compareDates(p.end, today) >= 0).map((p) => ({ start: p.start, end: p.end })),
      booking: { servicePercent: settings.servicePercent, maxAdvanceDays: settings.maxAdvanceDays, today },
    };
  }

  /** Someone as everyone may see them, with their rating from public reviews. */
  async ownerSummary(user: User): Promise<OwnerSummary> {
    const [completedDeals, listingCount, ratings, responseMinutes] = await Promise.all([
      this.prisma.booking.count({ where: { status: 'COMPLETED', OR: [{ ownerId: user.id }, { renterId: user.id }] } }),
      this.prisma.listing.count({ where: { ...CATALOG_VISIBLE_WHERE, ownerId: user.id } }),
      this.reviews.ratingsOfUsers([user.id]),
      this.responseMinutes(user.id),
    ]);
    const rating = ratings.get(user.id) ?? { rating: null, reviewCount: 0 };
    return {
      id: user.id,
      name: publicName(user),
      username: user.username,
      city: user.city,
      memberSince: user.createdAt.toISOString(),
      emailVerified: user.emailVerifiedAt !== null,
      phoneVerified: user.phoneVerifiedAt !== null,
      identityVerified: user.identityVerifiedAt !== null,
      completedDeals,
      listingCount,
      rating: rating.rating,
      reviewCount: rating.reviewCount,
      responseMinutes,
    };
  }

  /**
   * How long someone usually takes to answer (a trust signal on their items): for every run of messages
   * from the other side in their conversations over the last 90 days, the time from the run's first
   * message to their next one; the median, in whole minutes, once there are at least two answers.
   */
  private async responseMinutes(userId: string): Promise<number | null> {
    const since = new Date(this.clock.now().getTime() - 90 * 86_400_000);
    const [row] = await this.prisma.$queryRaw<{ median: number | null; n: number }[]>`
      WITH talk AS (
        SELECT m."conversationId", m."authorId", m."createdAt",
               lag(m."authorId") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt", m."id") AS prev
        FROM "Message" m JOIN "Conversation" c ON c."id" = m."conversationId"
        WHERE m."kind" = 'TEXT' AND (c."ownerId" = ${userId} OR c."renterId" = ${userId}) AND m."createdAt" >= ${since}
      ),
      asked AS (
        SELECT t."conversationId", t."createdAt" FROM talk t
        WHERE t."authorId" <> ${userId} AND (t.prev IS NULL OR t.prev = ${userId})
      )
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM r."createdAt" - a."createdAt") / 60)::float AS median,
             count(*)::int AS n
      FROM asked a
      JOIN LATERAL (
        SELECT x."createdAt" FROM "Message" x
        WHERE x."conversationId" = a."conversationId" AND x."authorId" = ${userId} AND x."createdAt" > a."createdAt"
        ORDER BY x."createdAt" LIMIT 1
      ) r ON TRUE`;
    return row && row.n >= 2 && row.median !== null ? Math.round(row.median) : null;
  }

  /**
   * The home's "For you" (owner, 2026-11-16): visible items of the country ranked by popularity and the
   * person's interests (rankForYou). `userId` adds what the server knows (favourites, rentals, follows)
   * and leaves out their own items; `categories` is what this browser looked at.
   */
  async forYou(input: { country?: string; categories: string[]; userId?: string }): Promise<ForYouResponse> {
    const candidates = await this.prisma.listing.findMany({
      where: { ...CATALOG_VISIBLE_WHERE, ...(input.country && { country: input.country }), ...(input.userId && { ownerId: { not: input.userId } }) },
      select: { id: true, ownerId: true, categoryId: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 400,
    });
    if (candidates.length === 0) return { items: [], personal: false };
    const ids = candidates.map((c) => c.id);
    const since = new Date(this.clock.now().getTime() - 60 * 86_400_000);
    const [favorites, requests, ratings] = await Promise.all([
      this.prisma.favorite.groupBy({ by: ['listingId'], where: { listingId: { in: ids } }, _count: { _all: true } }),
      this.prisma.booking.groupBy({ by: ['listingId'], where: { listingId: { in: ids }, createdAt: { gte: since } }, _count: { _all: true } }),
      this.reviews.ratingsOfListings(ids),
    ]);
    const favCount = new Map(favorites.map((f) => [f.listingId, f._count._all]));
    const reqCount = new Map(requests.map((r) => [r.listingId, r._count._all]));
    const categories = new Set(input.categories);
    const owners = new Set<string>();
    if (input.userId) {
      const [faved, rented, follows] = await Promise.all([
        this.prisma.favorite.findMany({ where: { userId: input.userId }, select: { listing: { select: { categoryId: true } } }, take: 100 }),
        this.prisma.booking.findMany({ where: { renterId: input.userId }, select: { listing: { select: { categoryId: true } } }, take: 50 }),
        this.prisma.follow.findMany({ where: { followerId: input.userId }, select: { followeeId: true } }),
      ]);
      for (const row of [...faved, ...rented]) if (row.listing.categoryId) categories.add(row.listing.categoryId);
      for (const row of follows) owners.add(row.followeeId);
    }
    const order = rankForYou(
      candidates.map((c) => ({
        ...c,
        favorites: favCount.get(c.id) ?? 0,
        requests: reqCount.get(c.id) ?? 0,
        rating: ratings.get(c.id)?.rating ?? null,
        reviewCount: ratings.get(c.id)?.reviewCount ?? 0,
      })),
      { categories, owners },
      this.clock.now(),
    );
    return { items: await this.items(order), personal: categories.size > 0 || owners.size > 0 };
  }

  /** Visible items by id, in the order given (ids that are not visible are left out). */
  async items(ids: string[]): Promise<CatalogItem[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.listing.findMany({ where: { id: { in: ids }, ...CATALOG_VISIBLE_WHERE }, include: { photos: true } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ratings = await this.reviews.ratingsOfListings(rows.map((row) => row.id));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [serializeCatalogItem(row, this.urlFor, ratings.get(id))] : [];
    });
  }

  /** What the site's sitemaps list: visible items, owners with items, every active category with its count. */
  async sitemap(): Promise<SitemapResponse> {
    const [listings, tree] = await Promise.all([
      this.prisma.listing.findMany({
        where: CATALOG_VISIBLE_WHERE,
        select: { id: true, title: true, contentLocale: true, updatedAt: true, categoryId: true, ownerId: true, owner: { select: { updatedAt: true } } },
        orderBy: { id: 'asc' },
      }),
      this.categories.tree(),
    ]);
    const perCategory = new Map<string, number>();
    for (const listing of listings) if (listing.categoryId) perCategory.set(listing.categoryId, (perCategory.get(listing.categoryId) ?? 0) + 1);
    const users = new Map<string, Date>();
    for (const listing of listings) users.set(listing.ownerId, listing.owner.updatedAt);
    return {
      listings: listings.map((l) => ({ id: l.id, slug: listingSlug(l.title), contentLocale: l.contentLocale as Locale, updatedAt: l.updatedAt.toISOString() })),
      users: [...users].map(([id, updatedAt]) => ({ id, updatedAt: updatedAt.toISOString() })),
      categories: tree.flatMap(subtree).map((node) => ({
        slug: node.slug,
        slugs: node.slugs,
        count: subtree(node).reduce((sum, below) => sum + (perCategory.get(below.id) ?? 0), 0),
      })),
    };
  }

  /** Resolves what the query names by slug or text, and checks its dates against today. */
  private async context(query: CatalogQuery): Promise<FilterContext> {
    if (query.start !== undefined) {
      const today = this.today();
      const { maxAdvanceDays } = await this.rules.settings();
      if (compareDates(query.start as LocalDate, today) < 0) throw new AppError('VALIDATION_FAILED', 400, undefined, { start: 'In the past' });
      if (compareDates(query.start as LocalDate, addDays(today, maxAdvanceDays)) > 0) {
        throw new AppError('VALIDATION_FAILED', 400, undefined, { start: 'Too far ahead' });
      }
    }
    const needsTree = query.category !== undefined || query.q !== undefined;
    const all = needsTree ? (await this.categories.tree()).flatMap(subtree) : [];
    let categoryIds: string[] | null = null;
    if (query.category !== undefined) {
      const node = all.find((candidate) => candidate.slug === query.category);
      categoryIds = node ? subtree(node).map((below) => below.id) : [];
    }
    const text = query.q !== undefined ? textWords(query.q, searchable(all)) : [];
    let districts: string[] | null = null;
    if (query.district !== undefined) {
      const rows = await this.prisma.$queryRaw<{ district: string }[]>`
        SELECT DISTINCT l."district" AS district ${VISIBLE_FROM} WHERE ${CATALOG_VISIBLE_SQL} AND l."district" IS NOT NULL`;
      districts = rows.map((row) => row.district).filter((name) => slugify(name) === query.district);
    }
    let cities: string[] | null = null;
    if (query.city !== undefined) {
      const rows = await this.prisma.$queryRaw<{ city: string }[]>`
        SELECT DISTINCT l."city" AS city ${VISIBLE_FROM} WHERE ${CATALOG_VISIBLE_SQL} AND l."city" IS NOT NULL`;
      // Any spelling of the city counts (Rīga / Riga / Рига, owner 2026-11-16: search by city).
      const aliases = await this.directory.aliases(query.city, query.country);
      cities = rows.map((row) => row.city).filter((name) => aliases.has(slugify(name)));
    }
    return { categoryIds, text, districts, cities };
  }
}
