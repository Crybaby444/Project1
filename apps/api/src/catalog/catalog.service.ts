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
import { PrismaService } from '../prisma/prisma.service';
import { fold, orderSql, textMatchSql, VISIBLE_FROM, whereSql, type FilterContext } from './catalog-query';
import { serializeCatalogItem } from './catalog.serializer';
import { CATALOG_VISIBLE_SQL, CATALOG_VISIBLE_WHERE, catalogState } from './visibility';

/** Owners and rentals are counted in the item's own zone; every listing is in Riga for now. */
const CATALOG_TIME_ZONE = 'Europe/Riga';

const notFound = () => new AppError('NOT_FOUND', 404, 'Listing not found');
const gone = () => new AppError('LISTING_GONE', 410, 'Listing removed');

/** Every category below `node`, itself included. */
function subtree(node: CategoryNode): CategoryNode[] {
  return [node, ...node.children.flatMap(subtree)];
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
  ) {}

  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  private today(): LocalDate {
    return localDateIn(this.clock.now(), CATALOG_TIME_ZONE);
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
    const wanted = fold(q);
    const all = tree.flatMap(subtree);
    const score = (node: CategoryNode) => {
      const names = [node.names[lang], node.names.en, node.names.lv, node.names.ru].map(fold);
      const at = names.findIndex((name) => name.includes(wanted));
      if (at === -1) return -1;
      return (names[at]!.startsWith(wanted) ? 0 : 10) + (at === 0 ? 0 : 1);
    };
    const categories = all
      .map((node) => ({ node, rank: score(node) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(({ node }) => ({ slug: node.slug, slugs: node.slugs, names: node.names, sticker: node.sticker }));
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT l."id" ${VISIBLE_FROM} WHERE ${CATALOG_VISIBLE_SQL} AND ${textMatchSql(q, [])}
      ORDER BY word_similarity(yoyo_fold(${q}), yoyo_fold(coalesce(l."title", ''))) DESC, l."publishedAt" DESC, l."id" DESC
      LIMIT 5`;
    const listings = (await this.items(rows.map((row) => row.id))).map((item) => ({ id: item.id, title: item.title, cover: item.cover }));
    return { categories, listings };
  }

  /** Districts with items, most items first; names that read the same as a slug are counted together. */
  async places(): Promise<PlacesResponse> {
    const rows = await this.prisma.$queryRaw<{ district: string; count: number }[]>`
      SELECT l."district" AS district, count(*)::int AS count ${VISIBLE_FROM}
      WHERE ${CATALOG_VISIBLE_SQL} AND l."district" IS NOT NULL GROUP BY l."district" ORDER BY count(*) DESC, l."district"`;
    const bySlug = new Map<string, { district: string; slug: string; count: number }>();
    for (const row of rows) {
      const slug = slugify(row.district);
      if (slug === '') continue;
      const known = bySlug.get(slug);
      if (known) known.count += row.count;
      else bySlug.set(slug, { district: row.district, slug, count: row.count });
    }
    return { districts: [...bySlug.values()].sort((a, b) => b.count - a.count || a.district.localeCompare(b.district)) };
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
    const [settings, blocked, owner] = await Promise.all([
      this.rules.settings(),
      blockedPeriods(this.prisma, found.id),
      this.ownerSummary(found.owner),
    ]);
    return {
      available: true,
      listing: serializeListing(found, 'public', this.urlFor),
      owner,
      blocked: blocked.filter((p) => compareDates(p.end, today) >= 0).map((p) => ({ start: p.start, end: p.end })),
      booking: { servicePercent: settings.servicePercent, maxAdvanceDays: settings.maxAdvanceDays, today },
    };
  }

  /** Someone as everyone may see them. Reviews arrive with plan 10: until then no rating. */
  async ownerSummary(user: User): Promise<OwnerSummary> {
    const [completedDeals, listingCount] = await Promise.all([
      this.prisma.booking.count({ where: { status: 'COMPLETED', OR: [{ ownerId: user.id }, { renterId: user.id }] } }),
      this.prisma.listing.count({ where: { ...CATALOG_VISIBLE_WHERE, ownerId: user.id } }),
    ]);
    return {
      id: user.id,
      name: user.name,
      city: user.city,
      memberSince: user.createdAt.toISOString(),
      emailVerified: user.emailVerifiedAt !== null,
      phoneVerified: user.phoneVerifiedAt !== null,
      completedDeals,
      listingCount,
      rating: null,
    };
  }

  /** Visible items by id, in the order given (ids that are not visible are left out). */
  async items(ids: string[]): Promise<CatalogItem[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.listing.findMany({ where: { id: { in: ids }, ...CATALOG_VISIBLE_WHERE }, include: { photos: true } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [serializeCatalogItem(row, this.urlFor)] : [];
    });
  }

  /** What the site's sitemaps list: visible items, owners with items, every active category with its count. */
  async sitemap(): Promise<SitemapResponse> {
    const [listings, tree] = await Promise.all([
      this.prisma.listing.findMany({
        where: CATALOG_VISIBLE_WHERE,
        select: { id: true, contentLocale: true, updatedAt: true, categoryId: true, ownerId: true, owner: { select: { updatedAt: true } } },
        orderBy: { id: 'asc' },
      }),
      this.categories.tree(),
    ]);
    const perCategory = new Map<string, number>();
    for (const listing of listings) if (listing.categoryId) perCategory.set(listing.categoryId, (perCategory.get(listing.categoryId) ?? 0) + 1);
    const users = new Map<string, Date>();
    for (const listing of listings) users.set(listing.ownerId, listing.owner.updatedAt);
    return {
      listings: listings.map((l) => ({ id: l.id, contentLocale: l.contentLocale as Locale, updatedAt: l.updatedAt.toISOString() })),
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
    let textCategoryIds: string[] = [];
    if (query.q !== undefined && query.q.length >= 3) {
      const wanted = fold(query.q);
      const named = all.filter((node) => Object.values(node.names).some((name) => fold(name).includes(wanted)));
      textCategoryIds = [...new Set(named.flatMap(subtree).map((node) => node.id))];
    }
    let districts: string[] | null = null;
    if (query.district !== undefined) {
      const rows = await this.prisma.$queryRaw<{ district: string }[]>`
        SELECT DISTINCT l."district" AS district ${VISIBLE_FROM} WHERE ${CATALOG_VISIBLE_SQL} AND l."district" IS NOT NULL`;
      districts = rows.map((row) => row.district).filter((name) => slugify(name) === query.district);
    }
    return { categoryIds, textCategoryIds, districts };
  }
}
