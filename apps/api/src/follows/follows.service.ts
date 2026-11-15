import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FollowFeed, PersonCard } from '@yoyo/shared';
import { serializeCatalogItem } from '../catalog/catalog.serializer';
import { escapeLike } from '../catalog/catalog-query';
import { CATALOG_VISIBLE_WHERE } from '../catalog/visibility';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { UrlFor } from '../listings/listing.serializer';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';

const FEED_PAGE = 24;
const SEARCH_LIMIT = 20;

/**
 * Following people (owner, 2026-11-16): follow and unfollow, who follows whom, the feed of new items
 * from the people you follow, a bell notice when one of them publishes, and finding people by name.
 */
@Injectable()
export class FollowsService {
  private readonly logger = new Logger('Follows');
  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    private readonly notifications: NotificationsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Only people with a public profile can be followed: not yourself, not blocked or deleted, not staff. */
  async follow(followerId: string, followeeId: string): Promise<void> {
    if (followerId === followeeId) throw new AppError('ACTION_NOT_ALLOWED', 409, 'You cannot follow yourself', undefined, { why: 'SELF' });
    const target = await this.prisma.user.findUnique({ where: { id: followeeId } });
    if (!target || target.blockedAt !== null || target.deletedAt !== null || target.role === 'ADMIN') throw new AppError('NOT_FOUND', 404, 'User not found');
    await this.prisma.follow.upsert({
      where: { followerId_followeeId: { followerId, followeeId } },
      create: { followerId, followeeId, createdAt: this.clock.now() },
      update: {},
    });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.follow.deleteMany({ where: { followerId, followeeId } });
  }

  async followingIds(userId: string): Promise<string[]> {
    return (await this.prisma.follow.findMany({ where: { followerId: userId }, select: { followeeId: true } })).map((f) => f.followeeId);
  }

  async counts(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.prisma.follow.count({ where: { followeeId: userId, follower: { deletedAt: null, blockedAt: null } } }),
      this.prisma.follow.count({ where: { followerId: userId, followee: { deletedAt: null, blockedAt: null } } }),
    ]);
    return { followers, following };
  }

  /** The people `userId` follows, as cards. */
  async following(userId: string): Promise<PersonCard[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: userId, followee: { deletedAt: null, blockedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: { followeeId: true },
    });
    return this.cards(rows.map((r) => r.followeeId));
  }

  /** New items from the people you follow, newest first. */
  async feed(userId: string, page: number): Promise<FollowFeed> {
    const where = { ...CATALOG_VISIBLE_WHERE, owner: { followers: { some: { followerId: userId } } } };
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: { photos: true, owner: { select: { id: true, name: true } } },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * FEED_PAGE,
        take: FEED_PAGE,
      }),
      this.prisma.listing.count({ where }),
    ]);
    const ratings = await this.reviews.ratingsOfListings(rows.map((l) => l.id));
    return { items: rows.map((l) => ({ ...serializeCatalogItem(l, this.urlFor, ratings.get(l.id)), owner: l.owner })), total };
  }

  /** People by username (`@olga…`, exact and prefix first) or by name (accents ignored); only public profiles. */
  async search(q: string): Promise<PersonCard[]> {
    const like = `%${escapeLike(q)}%`;
    const prefix = `${escapeLike(q)}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT u."id" FROM "User" u
      WHERE u."deletedAt" IS NULL AND u."blockedAt" IS NULL AND u."role" = 'USER'
        AND (u."username" LIKE lower(${prefix}) ESCAPE '\\' OR yoyo_fold(u."name") LIKE yoyo_fold(${like}) ESCAPE '\\')
      ORDER BY (u."username" = lower(${q})) DESC, (u."username" LIKE lower(${prefix}) ESCAPE '\\') DESC,
        (SELECT count(*) FROM "Follow" f WHERE f."followeeId" = u."id") DESC, u."createdAt" ASC
      LIMIT ${SEARCH_LIMIT}`;
    return this.cards(rows.map((r) => r.id));
  }

  /** A listing was just published: its owner's followers hear of it. Never fails the caller. */
  async listingPublished(listingId: string): Promise<void> {
    try {
      const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { ownerId: true, title: true } });
      if (!listing) return;
      const followers = await this.prisma.follow.findMany({
        where: { followeeId: listing.ownerId, follower: { deletedAt: null, blockedAt: null } },
        select: { followerId: true },
      });
      await this.notifications.notify(
        followers.map((f) => f.followerId),
        { kind: 'FOLLOW', event: 'NEW_LISTING', listingId, title: listing.title ?? '' },
      );
    } catch (error) {
      this.logger.error(`follower notice for ${listingId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async cards(ids: string[]): Promise<PersonCard[]> {
    if (ids.length === 0) return [];
    const [users, listings, followers, ratings] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, city: true } }),
      this.prisma.listing.groupBy({ by: ['ownerId'], where: { ...CATALOG_VISIBLE_WHERE, ownerId: { in: ids } }, _count: { _all: true } }),
      this.prisma.follow.groupBy({ by: ['followeeId'], where: { followeeId: { in: ids } }, _count: { _all: true } }),
      this.reviews.ratingsOfUsers(ids),
    ]);
    const byId = new Map(users.map((u) => [u.id, u]));
    const listingCount = new Map(listings.map((l) => [l.ownerId, l._count._all]));
    const followerCount = new Map(followers.map((f) => [f.followeeId, f._count._all]));
    return ids.flatMap((id) => {
      const u = byId.get(id);
      if (!u) return [];
      const r = ratings.get(id);
      return [{ id, name: u.name, username: u.username, city: u.city, listingCount: listingCount.get(id) ?? 0, followers: followerCount.get(id) ?? 0, rating: r?.rating ?? null, reviewCount: r?.reviewCount ?? 0 }];
    });
  }
}
