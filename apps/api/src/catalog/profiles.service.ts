import { Inject, Injectable } from '@nestjs/common';
import type { PublicProfile } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import type { UrlFor } from '../listings/listing.serializer';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { serializeCatalogItem } from './catalog.serializer';
import { CatalogService } from './catalog.service';
import { CATALOG_VISIBLE_WHERE } from './visibility';
import { ReviewsService } from '../reviews/reviews.service';

/** Items shown on a profile. */
const PROFILE_ITEMS = 48;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly reviews: ReviewsService,
  ) {}

  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  /** A blocked or deleted account has no public profile. */
  async profile(id: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.blockedAt !== null || user.deletedAt !== null) throw new AppError('NOT_FOUND', 404, 'User not found');
    const [summary, listings] = await Promise.all([
      this.catalog.ownerSummary(user),
      this.prisma.listing.findMany({
        where: { ...CATALOG_VISIBLE_WHERE, ownerId: id },
        include: { photos: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: PROFILE_ITEMS,
      }),
    ]);
    const ratings = await this.reviews.ratingsOfListings(listings.map((l) => l.id));
    return { user: { ...summary, about: user.about }, listings: listings.map((l) => serializeCatalogItem(l, this.urlFor, ratings.get(l.id))) };
  }
}
