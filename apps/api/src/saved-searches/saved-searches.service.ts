import { Inject, Injectable, Logger } from '@nestjs/common';
import { SAVED_SEARCH_LIMIT, type CatalogQuery, type SavedSearch, type SavedSearchRequest } from '@yoyo/shared';
import { CatalogService } from '../catalog/catalog.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { SavedSearch as Row } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const queryOf = (row: Row): SavedSearchRequest => row.query as SavedSearchRequest;

const toView = (row: Row): SavedSearch => {
  const q = queryOf(row);
  return { id: row.id, q: q.q ?? null, category: q.category ?? null, priceMax: q.priceMax ?? null, district: q.district ?? null, createdAt: row.createdAt.toISOString() };
};

/**
 * Saved searches (owner, 2026-11-15): a person keeps catalog filters and hears in the bell when an item
 * that matches them is published. Matching is the catalog search itself (CatalogService.matches), so a
 * saved search finds exactly what the same search on the site would. Owners never hear about their own.
 */
@Injectable()
export class SavedSearchesService {
  private readonly logger = new Logger('SavedSearches');

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(userId: string): Promise<SavedSearch[]> {
    const rows = await this.prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toView);
  }

  async create(userId: string, request: SavedSearchRequest): Promise<SavedSearch> {
    const count = await this.prisma.savedSearch.count({ where: { userId } });
    if (count >= SAVED_SEARCH_LIMIT) {
      throw new AppError('ACTION_NOT_ALLOWED', 409, 'Too many saved searches', undefined, { why: 'SAVED_SEARCH_LIMIT' });
    }
    const query = Object.fromEntries(Object.entries(request).filter(([, v]) => v !== undefined));
    return toView(await this.prisma.savedSearch.create({ data: { userId, query, createdAt: this.clock.now() } }));
  }

  async remove(userId: string, id: string): Promise<void> {
    const done = await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    if (done.count === 0) throw new AppError('NOT_FOUND', 404, 'Saved search not found');
  }

  /** A listing was just published: tell everyone whose saved search it matches. Never fails the caller. */
  async listingPublished(listingId: string): Promise<void> {
    try {
      const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { ownerId: true, title: true } });
      if (!listing) return;
      const searches = await this.prisma.savedSearch.findMany({
        where: { userId: { not: listing.ownerId }, user: { deletedAt: null, blockedAt: null } },
      });
      const told = new Set<string>();
      for (const search of searches) {
        if (told.has(search.userId)) continue;
        const query = { ...queryOf(search), page: 1 } as CatalogQuery;
        if (await this.catalog.matches(query, listingId)) told.add(search.userId);
      }
      await this.notifications.notify([...told], { kind: 'SEARCH', event: 'MATCH', listingId, title: listing.title });
    } catch (error) {
      this.logger.error(`saved-search check for ${listingId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
