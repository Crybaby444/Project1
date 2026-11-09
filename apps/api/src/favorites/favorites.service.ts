import { Inject, Injectable } from '@nestjs/common';
import type { FavoriteItem } from '@yoyo/shared';
import { serializeCatalogItem } from '../catalog/catalog.serializer';
import { CATALOG_VISIBLE_WHERE, isCatalogVisible } from '../catalog/visibility';
import { AppError } from '../common/app-error';
import type { UrlFor } from '../listings/listing.serializer';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';

/** Someone's favourites (spec §4.2). Adding and removing are idempotent, so a retry never fails. */
@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  /** Only an item the catalog shows can be added; anything else does not exist for the caller (404). */
  async add(userId: string, listingId: string): Promise<void> {
    const visible = await this.prisma.listing.count({ where: { id: listingId, ...CATALOG_VISIBLE_WHERE } });
    if (visible === 0) throw new AppError('NOT_FOUND', 404, 'Listing not found');
    await this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
    });
  }

  async remove(userId: string, listingId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
  }

  /** Ids of favourites the catalog still shows (for the hearts on a page). */
  async ids(userId: string): Promise<string[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId, listing: CATALOG_VISIBLE_WHERE },
      select: { listingId: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => row.listingId);
  }

  /**
   * Every favourite, newest first. One that left the catalog stays, `available: false`, with only its
   * title: its price and photos are not public any more.
   */
  async list(userId: string): Promise<FavoriteItem[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      include: { listing: { include: { photos: true, owner: { select: { blockedAt: true, deletedAt: true } } } } },
      orderBy: [{ createdAt: 'desc' }, { listingId: 'asc' }],
    });
    return rows.map(({ listing }) => {
      const item = serializeCatalogItem(listing, this.urlFor);
      if (isCatalogVisible(listing)) return { ...item, available: true };
      return { ...item, cover: null, dailyCents: 0, depositCents: 0, weeklyDiscountPercent: 0, district: null, city: null, available: false };
    });
  }
}
