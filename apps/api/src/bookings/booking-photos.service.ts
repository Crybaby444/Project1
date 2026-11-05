import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BOOKING_LIMITS, type BookingPhoto, type BookingPhotoKind, type PublicUser } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { BookingPhoto as BookingPhotoRow, BookingStatus, Prisma } from '../generated/prisma/client';
import { checkImage } from '../media/image-check';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { bookingNotFound } from './booking-errors';

/** Who may add each kind of photo, and while the deal is in which statuses. */
const RULES: Record<BookingPhotoKind, { by: readonly ('RENTER' | 'OWNER')[]; in: readonly BookingStatus[] }> = {
  HANDOVER: { by: ['OWNER'], in: ['PAID', 'ACTIVE'] },
  RETURN: { by: ['RENTER', 'OWNER'], in: ['ACTIVE', 'RETURNED'] },
  DAMAGE: { by: ['OWNER'], in: ['RETURNED'] },
};

/**
 * Photos of the item's condition on a deal (spec §4.4: at handover, at return, of damage), stored like
 * listing photos: checked by their bytes, cleaned of metadata, under random keys. The administrator
 * deciding a dispute sees them.
 */
@Injectable()
export class BookingPhotosService {
  private readonly logger = new Logger('BookingPhotos');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async add(bookingId: string, user: PublicUser, kind: BookingPhotoKind, file: Buffer): Promise<BookingPhoto> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    const side = booking?.renterId === user.id ? 'RENTER' : booking?.ownerId === user.id ? 'OWNER' : null;
    if (!booking || side === null) throw bookingNotFound();
    const rule = RULES[kind];
    if (!rule.by.includes(side) || !rule.in.includes(booking.status)) {
      throw new AppError('ACTION_NOT_ALLOWED', 409, `Not possible for this side while the deal is ${booking.status}`, undefined, {
        status: booking.status,
        kind,
      });
    }
    if (!this.storage.enabled) throw new AppError('STORAGE_DISABLED', 503);
    const { mime } = await checkImage(file);
    const storageKey = randomUUID();
    const stored = await this.storage.put(storageKey, file, mime);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
        const count = await tx.bookingPhoto.count({ where: { bookingId, kind } });
        if (count >= BOOKING_LIMITS.damagePhotos) throw new AppError('PHOTO_LIMIT', 409, `At most ${BOOKING_LIMITS.damagePhotos} photos of each kind`);
        return tx.bookingPhoto.create({ data: { bookingId, uploaderId: user.id, kind, storageKey, ...stored, createdAt: this.clock.now() } });
      });
      return this.serialize(row);
    } catch (error) {
      await this.storage.delete(storageKey).catch((cause: unknown) => this.logger.error(`could not delete ${storageKey}: ${String(cause)}`));
      throw error;
    }
  }

  async list(bookingId: string, user: PublicUser): Promise<BookingPhoto[]> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || (booking.renterId !== user.id && booking.ownerId !== user.id && user.role !== 'ADMIN')) throw bookingNotFound();
    const rows = await this.prisma.bookingPhoto.findMany({ where: { bookingId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return rows.map((row) => this.serialize(row));
  }

  serialize(row: BookingPhotoRow): BookingPhoto {
    return {
      id: row.id,
      kind: row.kind,
      uploaderId: row.uploaderId,
      width: row.width,
      height: row.height,
      urls: { thumb: this.storage.url(row.storageKey, 'thumb'), card: this.storage.url(row.storageKey, 'card'), full: this.storage.url(row.storageKey, 'full') },
      createdAt: row.createdAt.toISOString(),
    };
  }
}

/** A damage claim names damage photos of this deal only (400 `fields.photoIds` otherwise). */
export async function assertDamagePhotos(tx: Prisma.TransactionClient, bookingId: string, photoIds: readonly string[]): Promise<void> {
  const found = await tx.bookingPhoto.count({ where: { bookingId, kind: 'DAMAGE', id: { in: [...photoIds] } } });
  if (found !== new Set(photoIds).size) {
    throw new AppError('VALIDATION_FAILED', 400, undefined, { photoIds: 'Upload the damage photos to this deal first (kind DAMAGE)' });
  }
}
