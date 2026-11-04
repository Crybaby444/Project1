import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  availableActions,
  cents,
  createRequest,
  daysIn,
  localDate,
  period,
  quote,
  type Actor,
  type BookingSnapshot,
  type DecideContext,
} from '@yoyo/domain';
import { BOOKINGS_PAGE_SIZE, type BookingRequest, type BookingStatus, type BookingView, type BookingsPage, type PublicUser, type QuoteResponse } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Prisma } from '../generated/prisma/client';
import type { UrlFor } from '../listings/listing.serializer';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { BookingRulesService } from './booking-rules.service';
import { BOOKING_INCLUDE, serializeBooking, type BookingWithParties } from './booking.serializer';
import { dateOf, snapshotData, toSnapshot } from './booking.store';
import { EffectsExecutor, type AfterCommit } from './effects.executor';
import { blockedPeriods, bookableListing, pricingOf } from './listing-access';

export const bookingNotFound = () => new AppError('NOT_FOUND', 404, 'Booking not found');

const offerUnavailable = () => new AppError('OFFER_UNAVAILABLE', 409);

/** The viewer's side of a deal, or null when it is not theirs (administrators see every deal). */
export function actorFor(row: { renterId: string; ownerId: string }, user: Pick<PublicUser, 'id' | 'role'>): Actor | null {
  if (row.renterId === user.id) return { kind: 'RENTER', userId: user.id };
  if (row.ownerId === user.id) return { kind: 'OWNER', userId: user.id };
  if (user.role === 'ADMIN') return { kind: 'ADMIN', userId: user.id };
  return null;
}

/**
 * Deals on the rules of @yoyo/domain (plan 8). The API never decides a step itself: it loads the
 * snapshot, asks the domain, saves the answer and carries out its effects in one transaction.
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: BookingRulesService,
    private readonly effects: EffectsExecutor,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  /** What renting `listingId` for these days would cost; for anyone, on a bookable listing only. */
  async quote(listingId: string, start: string, end: string): Promise<QuoteResponse> {
    const listing = await bookableListing(this.prisma, listingId).catch((error: unknown) => {
      throw error instanceof AppError && error.code === 'LISTING_UNAVAILABLE' ? new AppError('NOT_FOUND', 404, 'Listing not found') : error;
    });
    const settings = await this.rules.settings();
    const p = period(localDate(start), localDate(end));
    const priced = quote({ pricing: pricingOf(listing), days: daysIn(p), servicePercent: settings.servicePercent });
    const blocked = await blockedPeriods(this.prisma, listingId);
    return { quote: { ...priced }, blocked: blocked.map((b) => ({ start: b.start, end: b.end })) };
  }

  /** Step 1: the renter asks for days, optionally at an accepted offer's price. */
  async create(renter: PublicUser, input: BookingRequest): Promise<BookingView> {
    const now = this.clock.now();
    const settings = await this.rules.settings();
    const { id, after } = await this.prisma.$transaction(async (tx) => {
      const listing = await bookableListing(tx, input.listingId);
      let agreedDailyCents: number | undefined;
      if (input.offerId !== undefined) {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (
          !offer ||
          offer.status !== 'ACCEPTED' ||
          offer.renterId !== renter.id ||
          offer.listingId !== listing.id ||
          offer.expiresAt <= now ||
          offer.start.getTime() !== dateOf(input.start).getTime() ||
          offer.end.getTime() !== dateOf(input.end).getTime()
        ) {
          throw offerUnavailable();
        }
        agreedDailyCents = offer.dailyCents;
      }
      const { next, effects } = createRequest(
        {
          id: randomUUID(),
          listingId: listing.id,
          renterId: renter.id,
          ownerId: listing.ownerId,
          period: period(localDate(input.start), localDate(input.end)),
          timeZone: listing.timeZone,
          pricing: pricingOf(listing),
          ...(agreedDailyCents !== undefined && { agreedDailyCents: cents(agreedDailyCents) }),
          blocked: await blockedPeriods(tx, listing.id),
        },
        { now, settings },
      );
      if (input.offerId !== undefined) {
        const used = await tx.offer.updateMany({ where: { id: input.offerId, status: 'ACCEPTED' }, data: { status: 'USED' } });
        if (used.count !== 1) throw offerUnavailable();
      }
      await tx.booking.create({
        data: {
          id: next.id,
          listingId: next.listingId,
          renterId: next.renterId,
          ownerId: next.ownerId,
          offerId: input.offerId ?? null,
          message: input.message || null,
          createdAt: next.createdAt,
          ...snapshotData(next),
        },
      });
      const done = await this.effects.run(tx, null, next, effects);
      await tx.bookingEvent.create({
        data: {
          bookingId: next.id,
          type: 'REQUEST',
          actorKind: 'RENTER',
          actorId: renter.id,
          fromStatus: null,
          toStatus: next.status,
          messages: done.messages,
          createdAt: now,
        },
      });
      return { id: next.id, after: done.after };
    });
    await this.afterCommit(after);
    return this.view(id, renter);
  }

  /** The deal as `user` sees it; 404 when it is not theirs. */
  async view(id: string, user: Pick<PublicUser, 'id' | 'role'>): Promise<BookingView> {
    const row = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!row) throw bookingNotFound();
    const actor = actorFor(row, user);
    if (actor === null) throw bookingNotFound();
    return this.serialize(row, actor);
  }

  async listMine(user: PublicUser, role: 'renter' | 'owner', status?: BookingStatus, page = 1): Promise<BookingsPage> {
    const where: Prisma.BookingWhereInput = { [role === 'renter' ? 'renterId' : 'ownerId']: user.id, ...(status && { status }) };
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * BOOKINGS_PAGE_SIZE,
        take: BOOKINGS_PAGE_SIZE,
      }),
      this.prisma.booking.count({ where }),
    ]);
    const items: BookingView[] = [];
    for (const row of rows) items.push(await this.serialize(row, actorFor(row, user)!));
    return { items, total };
  }

  /** The view with the actions `actor` may take now (ACCEPT needs the days other deals hold). */
  async serialize(row: BookingWithParties, actor: Actor): Promise<BookingView> {
    const s = toSnapshot(row);
    const ctx: DecideContext = {
      now: this.clock.now(),
      settings: await this.rules.settings(),
      ...(s.status === 'REQUESTED' && actor.kind === 'OWNER' && { blocked: await blockedPeriods(this.prisma, row.listingId, row.id) }),
    };
    const role = actor.kind === 'SYSTEM' ? 'ADMIN' : actor.kind;
    return serializeBooking(row, s, role, availableActions(s, actor, ctx), this.urlFor);
  }

  /** Work a committed decision left: emails (Task 13), money sent out (Task 8). */
  async afterCommit(after: AfterCommit): Promise<void> {
    void after;
  }

  /** The snapshot of a stored deal. */
  snapshot(row: Parameters<typeof toSnapshot>[0]): BookingSnapshot {
    return toSnapshot(row);
  }
}
