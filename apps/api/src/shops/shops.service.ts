import { Inject, Injectable } from '@nestjs/common';
import { publicName } from '../common/public-name';
import { SHOP_LIMITS, type MyShop, type ShopInput, type ShopResponse, type ShopSummary } from '@yoyo/shared';
import { serializeCatalogItem } from '../catalog/catalog.serializer';
import { CATALOG_VISIBLE_WHERE } from '../catalog/visibility';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Prisma } from '../generated/prisma/client';
import type { UrlFor } from '../listings/listing.serializer';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';

const SHOP_INCLUDE = {
  items: { orderBy: { sortOrder: 'asc' }, include: { listing: { include: { photos: { orderBy: { position: 'asc' }, take: 1 } } } } },
} as const satisfies Prisma.ShopInclude;
type ShopRow = Prisma.ShopGetPayload<{ include: typeof SHOP_INCLUDE }>;

const notFound = () => new AppError('NOT_FOUND', 404, 'Shop not found');

/**
 * Shops (owner, 2026-11-16: "not posts but shops with a collection"): a person groups their own items
 * under a name, optionally under a category; everyone sees them on the profile. Only items the catalog
 * shows appear publicly; the owner sees and orders all of theirs.
 */
@Injectable()
export class ShopsService {
  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** A person's shops as everyone sees them: those with at least one item in the catalog. */
  async ofUser(userId: string): Promise<ShopSummary[]> {
    const rows = await this.prisma.shop.findMany({ where: { ownerId: userId, owner: { deletedAt: null, blockedAt: null } }, include: SHOP_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((r) => this.summary(r, true)).filter((s) => s.itemCount > 0);
  }

  async one(id: string): Promise<ShopResponse> {
    const shop = await this.prisma.shop.findUnique({ where: { id }, include: { ...SHOP_INCLUDE, owner: { select: { id: true, name: true, username: true, deletedAt: true, blockedAt: true } } } });
    if (!shop || shop.owner.deletedAt !== null || shop.owner.blockedAt !== null) throw notFound();
    const ids = shop.items.map((i) => i.listingId);
    const listings = await this.prisma.listing.findMany({ where: { ...CATALOG_VISIBLE_WHERE, id: { in: ids } }, include: { photos: true } });
    const byId = new Map(listings.map((l) => [l.id, l]));
    const ordered = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    const ratings = await this.reviews.ratingsOfListings(ordered.map((l) => l.id));
    return {
      shop: this.summary(shop, true),
      owner: { id: shop.owner.id, name: publicName(shop.owner), username: shop.owner.username },
      items: ordered.map((l) => serializeCatalogItem(l, this.urlFor, ratings.get(l.id))),
    };
  }

  async mine(userId: string): Promise<MyShop[]> {
    const rows = await this.prisma.shop.findMany({ where: { ownerId: userId }, include: SHOP_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((r) => ({ ...this.summary(r, false), listingIds: r.items.map((i) => i.listingId) }));
  }

  async create(userId: string, input: ShopInput): Promise<MyShop> {
    const count = await this.prisma.shop.count({ where: { ownerId: userId } });
    if (count >= SHOP_LIMITS.perUser) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Too many shops', undefined, { why: 'SHOP_LIMIT' });
    await this.checkInput(userId, input);
    const shop = await this.prisma.shop.create({
      data: {
        ownerId: userId,
        name: input.name,
        about: input.about || null,
        categoryId: input.categoryId ?? null,
        sortOrder: count,
        createdAt: this.clock.now(),
        items: { create: (input.listingIds ?? []).map((listingId, sortOrder) => ({ listingId, sortOrder })) },
      },
      include: SHOP_INCLUDE,
    });
    return { ...this.summary(shop, false), listingIds: shop.items.map((i) => i.listingId) };
  }

  async update(userId: string, id: string, input: Partial<ShopInput>): Promise<MyShop> {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop || shop.ownerId !== userId) throw notFound();
    await this.checkInput(userId, input);
    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.about !== undefined && { about: input.about || null }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        },
      });
      if (input.listingIds !== undefined) {
        await tx.shopItem.deleteMany({ where: { shopId: id } });
        await tx.shopItem.createMany({ data: input.listingIds.map((listingId, sortOrder) => ({ shopId: id, listingId, sortOrder })) });
      }
      return tx.shop.findUniqueOrThrow({ where: { id }, include: SHOP_INCLUDE });
    });
    return { ...this.summary(saved, false), listingIds: saved.items.map((i) => i.listingId) };
  }

  async remove(userId: string, id: string): Promise<void> {
    const done = await this.prisma.shop.deleteMany({ where: { id, ownerId: userId } });
    if (done.count === 0) throw notFound();
  }

  /** Only your own items, each once; a category that exists. */
  private async checkInput(userId: string, input: Partial<ShopInput>): Promise<void> {
    const ids = input.listingIds ?? [];
    if (new Set(ids).size !== ids.length) throw new AppError('VALIDATION_FAILED', 400, 'An item is in the list twice', { listingIds: 'Duplicate' });
    if (ids.length > 0) {
      const own = await this.prisma.listing.count({ where: { id: { in: ids }, ownerId: userId, status: { not: 'ARCHIVED' } } });
      if (own !== ids.length) throw new AppError('VALIDATION_FAILED', 400, 'Only your own items', { listingIds: 'Not yours' });
    }
    if (input.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: input.categoryId }, select: { active: true } });
      if (!category?.active) throw new AppError('VALIDATION_FAILED', 400, 'No such category', { categoryId: 'Unknown' });
    }
  }

  private summary(shop: ShopRow, publicView: boolean): ShopSummary {
    const visible = shop.items.filter((i) => !publicView || (i.listing.status === 'PUBLISHED'));
    return {
      id: shop.id,
      name: shop.name,
      about: shop.about,
      categoryId: shop.categoryId,
      itemCount: visible.length,
      covers: visible.flatMap((i) => (i.listing.photos[0] ? [this.storage.url(i.listing.photos[0].storageKey, 'thumb')] : [])).slice(0, 3),
    };
  }
}
