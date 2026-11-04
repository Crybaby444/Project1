import { Inject, Injectable } from '@nestjs/common';
import { cents, endOfDayIn, localDate, localDateIn, period, validateOffer, validateRentalPeriod, DomainError } from '@yoyo/domain';
import type { OfferRequest, OfferStatus, OfferView, PublicUser } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { DealNotifier } from '../bookings/deal-notifier';
import { dayOf, dateOf } from '../bookings/booking.store';
import { bookableListing, pricingOf } from '../bookings/listing-access';
import type { Listing, Offer, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const HOUR = 3_600_000;
/** The owner answers an offer within this long (or before the first day ends). */
const ANSWER_HOURS = 24;

type OfferRow = Offer & { listing: Listing; renter: User; owner: User };

const INCLUDE = { listing: true, renter: true, owner: true } as const;

const unavailable = () => new AppError('OFFER_UNAVAILABLE', 409);
const notFound = () => new AppError('NOT_FOUND', 404, 'Offer not found');

/**
 * "Offer your own price" (spec §4.6): a renter proposes a daily price for some days, the owner accepts
 * or declines with one click, and an accepted offer prices one booking request for exactly those days.
 * The chat button around it comes with plan 9.
 */
@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: BookingRulesService,
    private readonly notifier: DealNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(renter: PublicUser, listingId: string, input: OfferRequest): Promise<OfferView> {
    const listing = await bookableListing(this.prisma, listingId);
    if (listing.ownerId === renter.id) throw new DomainError('CANNOT_RENT_OWN', { userId: renter.id });
    const now = this.clock.now();
    const settings = await this.rules.settings();
    const p = period(localDate(input.start), localDate(input.end));
    validateRentalPeriod(p, {
      today: localDateIn(now, listing.timeZone),
      minDays: listing.minDays,
      maxDays: listing.maxDays,
      maxAdvanceDays: settings.maxAdvanceDays,
    });
    validateOffer(pricingOf(listing), cents(input.dailyCents));
    const expiresAt = new Date(Math.min(now.getTime() + ANSWER_HOURS * HOUR, endOfDayIn(p.start, listing.timeZone).getTime()));
    const offer = await this.prisma.$transaction(async (tx) => {
      // One open offer per renter and item: a new one replaces the one still waiting.
      await tx.offer.updateMany({ where: { listingId, renterId: renter.id, status: 'PENDING' }, data: { status: 'WITHDRAWN' } });
      return tx.offer.create({
        data: {
          listingId,
          renterId: renter.id,
          ownerId: listing.ownerId,
          start: dateOf(p.start),
          end: dateOf(p.end),
          dailyCents: input.dailyCents,
          expiresAt,
          createdAt: now,
        },
        include: INCLUDE,
      });
    });
    await this.notifier.offer('OFFER_MADE', offer.id);
    return this.serialize(offer);
  }

  async listMine(user: PublicUser, role: 'renter' | 'owner'): Promise<OfferView[]> {
    const rows = await this.prisma.offer.findMany({
      where: role === 'renter' ? { renterId: user.id } : { ownerId: user.id },
      include: INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map((row) => this.serialize(row));
  }

  /** The owner answers: ACCEPTED (bookable until the end of the first day) or DECLINED. */
  async answer(user: PublicUser, id: string, accept: boolean): Promise<OfferView> {
    const offer = await this.prisma.offer.findUnique({ where: { id }, include: INCLUDE });
    if (!offer || offer.ownerId !== user.id) throw notFound();
    if (this.statusOf(offer) !== 'PENDING') throw unavailable();
    if (accept) await bookableListing(this.prisma, offer.listingId);
    const updated = await this.prisma.offer.updateMany({
      where: { id, status: 'PENDING' },
      data: accept
        ? { status: 'ACCEPTED', answeredAt: this.clock.now(), expiresAt: endOfDayIn(dayOf(offer.start), offer.listing.timeZone) }
        : { status: 'DECLINED', answeredAt: this.clock.now() },
    });
    if (updated.count !== 1) throw unavailable();
    await this.notifier.offer(accept ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED', id);
    return this.serialize(await this.prisma.offer.findUniqueOrThrow({ where: { id }, include: INCLUDE }));
  }

  /** The renter takes back an offer that is waiting or accepted but not used. */
  async withdraw(user: PublicUser, id: string): Promise<OfferView> {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer || offer.renterId !== user.id) throw notFound();
    const updated = await this.prisma.offer.updateMany({
      where: { id, status: { in: ['PENDING', 'ACCEPTED'] }, expiresAt: { gt: this.clock.now() } },
      data: { status: 'WITHDRAWN' },
    });
    if (updated.count !== 1) throw unavailable();
    return this.serialize(await this.prisma.offer.findUniqueOrThrow({ where: { id }, include: INCLUDE }));
  }

  /** Marks offers whose time ran out (TimersService); reads already show them EXPIRED. */
  async expireDue(): Promise<number> {
    const { count } = await this.prisma.offer.updateMany({
      where: { status: { in: ['PENDING', 'ACCEPTED'] }, expiresAt: { lte: this.clock.now() } },
      data: { status: 'EXPIRED' },
    });
    return count;
  }

  /** The status as of now: an open offer past its time is EXPIRED even before the job marks it. */
  private statusOf(offer: Offer): OfferStatus {
    const open = offer.status === 'PENDING' || offer.status === 'ACCEPTED';
    return open && offer.expiresAt <= this.clock.now() ? 'EXPIRED' : offer.status;
  }

  private serialize(offer: OfferRow): OfferView {
    return {
      id: offer.id,
      listing: { id: offer.listing.id, title: offer.listing.title ?? '' },
      renter: { id: offer.renter.id, name: offer.renter.deletedAt ? 'Deleted user' : offer.renter.name },
      owner: { id: offer.owner.id, name: offer.owner.deletedAt ? 'Deleted user' : offer.owner.name },
      start: dayOf(offer.start),
      end: dayOf(offer.end),
      dailyCents: offer.dailyCents,
      listedDailyCents: offer.listing.dailyCents ?? 0,
      status: this.statusOf(offer),
      expiresAt: offer.expiresAt.toISOString(),
      answeredAt: offer.answeredAt?.toISOString() ?? null,
      createdAt: offer.createdAt.toISOString(),
    };
  }
}
