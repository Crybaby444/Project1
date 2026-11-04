import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { LISTING_LIMITS, type ListingPhoto } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import { incomplete } from '../listings/listing-completeness';
import { invalidStatus, ListingsService, mustStayComplete } from '../listings/listings.service';
import { serializePhoto, type UrlFor } from '../listings/listing.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { checkImage } from './image-check';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider';

const photoLimit = () => new AppError('PHOTO_LIMIT', 409);

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: ListingsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Adds a photo at the end (the first one is the cover). The file is checked by its bytes, cleaned of
   * metadata and stored under a random key. The limit of 8 holds under concurrent uploads: the count
   * is taken again with the listing row locked. A photo is content: a live listing goes to review.
   */
  async add(listingId: string, ownerId: string, file: Buffer): Promise<{ photo: ListingPhoto; version: number }> {
    const listing = await this.listings.owned(listingId, ownerId);
    if (listing.status === 'ARCHIVED') throw invalidStatus(listing.status);
    if (!this.storage.enabled) throw new AppError('STORAGE_DISABLED', 503);
    if (listing.photos.length >= LISTING_LIMITS.photos) throw photoLimit();
    const { mime } = await checkImage(file);

    const storageKey = randomUUID();
    const stored = await this.storage.put(storageKey, file, mime);
    try {
      const photo = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
        const fresh = await tx.listing.findUniqueOrThrow({ where: { id: listingId } });
        const count = await tx.listingPhoto.count({ where: { listingId } });
        if (count >= LISTING_LIMITS.photos) throw photoLimit();
        const created = await tx.listingPhoto.create({ data: { listingId, storageKey, ...stored, position: count } });
        await this.listings.write(fresh, {}, 'content', tx);
        return created;
      });
      const { version } = await this.prisma.listing.findUniqueOrThrow({ where: { id: listingId }, select: { version: true } });
      return { photo: serializePhoto(photo, this.urlFor), version };
    } catch (error) {
      await this.listings.forgetFiles([storageKey]);
      throw error;
    }
  }

  /** Removes a photo and its file; the photos after it move up, so the order has no gaps. */
  async remove(listingId: string, ownerId: string, photoId: string): Promise<void> {
    const listing = await this.listings.owned(listingId, ownerId);
    if (listing.status === 'ARCHIVED') throw invalidStatus(listing.status);
    const photo = listing.photos.find((candidate) => candidate.id === photoId);
    if (!photo) throw new AppError('NOT_FOUND', 404, 'Photo not found');
    if (mustStayComplete(listing.status) && listing.photos.length <= 1) {
      throw incomplete({ photos: 'A listing in review or in the catalog keeps at least one photo' });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.listingPhoto.delete({ where: { id: photo.id } });
      await tx.listingPhoto.updateMany({ where: { listingId, position: { gt: photo.position } }, data: { position: { decrement: 1 } } });
      await this.listings.write(listing, {}, 'content', tx);
    });
    await this.listings.forgetFiles([photo.storageKey]);
  }

  /** Sets the order from `ids`, which must name every photo of the listing exactly once. */
  async reorder(listingId: string, ownerId: string, ids: string[]): Promise<{ photos: ListingPhoto[]; version: number }> {
    const listing = await this.listings.owned(listingId, ownerId);
    if (listing.status === 'ARCHIVED') throw invalidStatus(listing.status);
    const own = new Set(listing.photos.map((photo) => photo.id));
    if (ids.length !== own.size || new Set(ids).size !== ids.length || !ids.every((id) => own.has(id))) {
      throw new AppError('VALIDATION_FAILED', 400, undefined, { ids: 'Send every photo of the listing exactly once' });
    }
    const current = [...listing.photos].sort((a, b) => a.position - b.position).map((photo) => photo.id);
    if (current.some((id, position) => ids[position] !== id)) {
      await this.prisma.$transaction(async (tx) => {
        for (const [position, id] of ids.entries()) await tx.listingPhoto.update({ where: { id }, data: { position } });
        await this.listings.write(listing, {}, 'content', tx);
      });
    }
    const fresh = await this.listings.owned(listingId, ownerId);
    return {
      photos: [...fresh.photos].sort((a, b) => a.position - b.position).map((photo) => serializePhoto(photo, this.urlFor)),
      version: fresh.version,
    };
  }

  private readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);
}
