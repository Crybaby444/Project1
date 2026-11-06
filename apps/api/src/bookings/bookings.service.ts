import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  availableActions,
  cents,
  createRequest,
  decide,
  DomainError,
  daysIn,
  localDate,
  localDateIn,
  period,
  quote,
  serviceFeeAt,
  type Actor,
  type BookingEvent,
  type BookingSettings,
  type BookingSnapshot,
  type DecideContext,
  type TimerKind,
} from '@yoyo/domain';
import {
  BOOKINGS_PAGE_SIZE,
  CLOSED_BOOKING_STATUSES,
  type BookingGroup,
  type BookingHistoryResponse,
  type BookingTerms,
  type MyBookingsSummary,
  type BookingEventInput,
  type BookingRequest,
  type ResolveRequest,
  type BookingStatus,
  type BookingView,
  type BookingsPage,
  type PublicUser,
  type QuoteResponse,
} from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { Prisma } from '../generated/prisma/client';
import { LedgerService, walletAccount } from '../ledger/ledger.service';
import type { UrlFor } from '../listings/listing.serializer';
import { MoneyOutService } from '../payments/money-out.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment.provider';
import { declined, unknownCard } from '../wallet/wallet.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { bookingNotFound, staleBooking } from './booking-errors';
import { assertDamagePhotos } from './booking-photos.service';
import { BookingRulesService } from './booking-rules.service';
import { DealNotifier } from './deal-notifier';
import { BOOKING_INCLUDE, serializeBooking, type BookingWithParties } from './booking.serializer';
import { dateOf, snapshotData, toSnapshot } from './booking.store';
import { EffectsExecutor, nothingAfter, type AfterCommit, type EffectContext } from './effects.executor';
import { blockedPeriods, bookableListing, pricingOf } from './listing-access';

export { bookingNotFound, staleBooking };

const offerUnavailable = () => new AppError('OFFER_UNAVAILABLE', 409);

/** One open request per renter and listing: the owner answers it first (or it expires). */
const openRequest = (bookingId: string) =>
  new AppError(
    'ACTION_NOT_ALLOWED',
    409,
    'You already asked for this item; wait for the answer or withdraw it',
    undefined,
    {
      why: 'OPEN_REQUEST',
      ...(bookingId && { bookingId }),
    },
  );

/** What is kept of an event in the deal's journal: never a card token. */
function journalData(event: BookingEvent): Prisma.InputJsonObject {
  const { type: _type, ...data } = event as BookingEvent & { cardToken?: string };
  delete (data as { cardToken?: string }).cardToken;
  return data as Prisma.InputJsonObject;
}

/** The domain's event for a side's input (the card token is not part of it). */
export function toDomainEvent(input: BookingEventInput): BookingEvent {
  if (input.type === 'PAY') return { type: 'PAY', method: input.method };
  return input as BookingEvent;
}

/** Nobody pays a deal whose owner was blocked or left (review of PR #3). */
function assertOwnerActive(row: { owner: { blockedAt: Date | null; deletedAt: Date | null } }): void {
  if (row.owner.blockedAt !== null || row.owner.deletedAt !== null)
    throw new AppError('LISTING_UNAVAILABLE', 409, 'The owner cannot take bookings now');
}

/** A decision saved: what changed and what is left for after the commit. */
export interface Saved {
  next: BookingSnapshot;
  after: AfterCommit;
  /** False when the domain changed nothing (signing twice, a timer not due): nothing was written. */
  changed: boolean;
}

/** The viewer's side of a deal, or null when it is not theirs (administrators see every deal). */
export function actorFor(
  row: { renterId: string; ownerId: string },
  user: Pick<PublicUser, 'id' | 'role'>,
): Actor | null {
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
    private readonly ledger: LedgerService,
    private readonly moneyOut: MoneyOutService,
    private readonly notifier: DealNotifier,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  /**
   * What anyone needs to price and book a listing in the browser (the inputs of the domain's `quote`)
   * and the days already taken. Same visibility as `quote`, except a listing that was public but is not
   * bookable now answers 409 LISTING_UNAVAILABLE, so the page can say so.
   */
  async terms(listingId: string): Promise<BookingTerms> {
    const listing = await bookableListing(this.prisma, listingId);
    const settings = await this.rules.settings();
    const cover = [...listing.photos].sort((a, b) => a.position - b.position)[0];
    const pricing = pricingOf(listing);
    const blocked = await blockedPeriods(this.prisma, listingId);
    const fee = serviceFeeAt(settings, this.clock.now(), listing.timeZone);
    return {
      listing: {
        id: listing.id,
        title: listing.title ?? '',
        coverUrl: cover ? this.urlFor(cover.storageKey, 'card') : null,
        city: listing.city,
        district: listing.district,
        ownerId: listing.owner.id,
        ownerName: listing.owner.name,
      },
      pricing: { ...pricing },
      servicePercent: fee.percent,
      servicePromoUntil: fee.promoUntil,
      regularServicePercent: settings.servicePercent,
      maxAdvanceDays: settings.maxAdvanceDays,
      timeZone: listing.timeZone,
      today: localDateIn(this.clock.now(), listing.timeZone),
      blocked: blocked.map((b) => ({ start: b.start, end: b.end })),
    };
  }

  /** What renting `listingId` for these days would cost; for anyone, on a bookable listing only. */
  async quote(listingId: string, start: string, end: string): Promise<QuoteResponse> {
    const listing = await bookableListing(this.prisma, listingId).catch((error: unknown) => {
      throw error instanceof AppError && error.code === 'LISTING_UNAVAILABLE'
        ? new AppError('NOT_FOUND', 404, 'Listing not found')
        : error;
    });
    const settings = await this.rules.settings();
    const p = period(localDate(start), localDate(end));
    const fee = serviceFeeAt(settings, this.clock.now(), listing.timeZone);
    const priced = quote({
      pricing: pricingOf(listing),
      days: daysIn(p),
      servicePercent: fee.percent,
      servicePromoUntil: fee.promoUntil,
    });
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
      const open = await tx.booking.findFirst({
        where: { renterId: renter.id, listingId: listing.id, status: 'REQUESTED' },
        select: { id: true },
      });
      if (open) throw openRequest(open.id);
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
        const used = await tx.offer.updateMany({
          where: { id: input.offerId, status: 'ACCEPTED' },
          data: { status: 'USED' },
        });
        if (used.count !== 1) throw offerUnavailable();
      }
      await tx.booking
        .create({
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
        })
        .catch(async (error: unknown) => {
          // Two requests at the same moment: the partial unique index Booking_one_open_request decides.
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
            throw openRequest('');
          throw error;
        });
      const row = await tx.booking.findUniqueOrThrow({ where: { id: next.id }, include: BOOKING_INCLUDE });
      const done = await this.effects.run(tx, { row, settings, now }, next, effects);
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

  /**
   * One step of a side (plan 8, Task 7), in one transaction: the row is locked, the client's `version`
   * must be the current one, the domain decides, and the answer is saved with its effects. When a
   * deadline passed first, its TIMEOUT is saved instead and the step answers 409 DEADLINE_PASSED.
   */
  async act(id: string, user: PublicUser, version: number, input: BookingEventInput): Promise<BookingView> {
    const now = this.clock.now();
    const settings = await this.rules.settings();
    const event = toDomainEvent(input);
    const charge =
      input.type === 'PAY' && input.cardToken !== undefined
        ? await this.chargeCard(id, user, version, input.cardToken, now, settings)
        : undefined;
    let outcome;
    try {
      outcome = await this.prisma.$transaction(async (tx) => {
        const row = await this.lockedRow(tx, id);
        const actor = row.renterId === user.id || row.ownerId === user.id ? actorFor(row, user) : null;
        if (actor === null) throw bookingNotFound();
        if (version !== row.version) throw staleBooking(row.version);
        if (event.type === 'PAY') assertOwnerActive(row);
        if (event.type === 'REPORT_DAMAGE') await assertDamagePhotos(tx, row.id, event.photoIds);
        const ctx: EffectContext & DecideContext = {
          ...(await this.context(tx, row, event, now, settings)),
          row,
          ...(charge && { charge }),
        };
        try {
          return { overdue: null, saved: await this.decideAndSave(tx, row, actor, event, ctx) };
        } catch (error) {
          const timer =
            error instanceof DomainError
              ? (error.details?.['overdueTimer'] as TimerKind | undefined)
              : undefined;
          if (timer === undefined) throw error;
          const saved = await this.decideAndSave(
            tx,
            row,
            { kind: 'SYSTEM' },
            { type: 'TIMEOUT', timer },
            ctx,
          );
          return { overdue: timer, saved };
        }
      });
    } catch (error) {
      // The card was charged but the deal did not take the payment: give the money back at once.
      if (charge) await this.moneyOut.giveBack(charge, { userId: user.id, bookingId: id, purpose: 'BOOKING' });
      throw error;
    }
    if (charge && outcome.overdue !== null) {
      await this.moneyOut.giveBack(charge, { userId: user.id, bookingId: id, purpose: 'BOOKING' });
    }
    await this.afterCommit(outcome.saved.after);
    if (outcome.overdue !== null) {
      throw new AppError('DEADLINE_PASSED', 409, undefined, undefined, {
        timer: outcome.overdue,
        status: outcome.saved.next.status,
      });
    }
    return this.view(id, user);
  }

  /**
   * Charges the renter's card for a PAY, before the transaction (a provider call never runs under a row
   * lock). The deal is checked first by asking the domain without saving, so a deal that cannot be paid
   * is never charged. Every attempt has its own provider key: a charge given back after a failed attempt
   * is never reused by a retry. The client's Idempotency-Key keeps double clicks to one attempt.
   */
  private async chargeCard(
    id: string,
    user: PublicUser,
    version: number,
    cardToken: string,
    now: Date,
    settings: BookingSettings,
  ) {
    const row = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!row || row.renterId !== user.id) throw bookingNotFound();
    if (version !== row.version) throw staleBooking(row.version);
    assertOwnerActive(row);
    try {
      decide(toSnapshot(row), { kind: 'RENTER', userId: user.id }, { type: 'PAY', method: 'CARD' }, { now, settings });
    } catch (error) {
      // The payment deadline passed: charge nothing; the transaction fires the deadline (DEADLINE_PASSED).
      if (error instanceof DomainError && error.details?.['overdueTimer'] !== undefined) return undefined;
      throw error;
    }
    const amountCents = row.totalCents;
    const result = await this.payments.charge({
      token: cardToken,
      amountCents,
      idempotencyKey: `booking:${id}:${randomUUID()}`,
      description: `Yoyo booking ${id}`,
    });
    if (result.status === 'DECLINED')
      throw result.declineCode === 'invalid_token' ? unknownCard() : declined(result.declineCode);
    return { ref: result.ref, brand: result.brand, last4: result.last4, amountCents };
  }

  /**
   * An administrator decides a dispute (RESOLVE): refund the deposit, give it to the owner, refund all,
   * or confirm the handover, as the domain allows for the dispute's reason. Never on their own deal.
   */
  async resolve(
    id: string,
    admin: PublicUser,
    version: number,
    decision: ResolveRequest['decision'],
    comment: string,
  ): Promise<BookingView> {
    const now = this.clock.now();
    const settings = await this.rules.settings();
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await this.lockedRow(tx, id);
      if (row.renterId === admin.id || row.ownerId === admin.id) {
        throw new AppError('AUTH_FORBIDDEN', 403, 'Another administrator decides disputes of your own deals');
      }
      if (version !== row.version) throw staleBooking(row.version);
      const event: BookingEvent = { type: 'RESOLVE', decision, comment };
      return this.decideAndSave(
        tx,
        row,
        { kind: 'ADMIN', userId: admin.id },
        event,
        await this.context(tx, row, event, now, settings),
      );
    });
    await this.afterCommit(saved.after);
    return this.view(id, admin);
  }

  /** Locks the booking row for the rest of the transaction and loads it with its listing and parties. */
  async lockedRow(tx: Prisma.TransactionClient, id: string): Promise<BookingWithParties> {
    const [locked] = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
    if (!locked) throw bookingNotFound();
    return tx.booking.findUniqueOrThrow({ where: { id }, include: BOOKING_INCLUDE });
  }

  /** What the domain needs to decide `event`: the days others hold (ACCEPT) and the wallet (PAY). */
  async context(
    tx: Prisma.TransactionClient,
    row: BookingWithParties,
    event: BookingEvent,
    now: Date,
    settings: BookingSettings,
  ): Promise<DecideContext> {
    const wallet = event.type === 'PAY' && event.method === 'WALLET' ? walletAccount(row.renterId) : null;
    // Every account the payment will post to is locked now, in the ledger's one order (sorted by id):
    // locking the wallet alone first would deadlock with a refund to the same wallet locking in order.
    // Held until the payment is saved, so two payments from one wallet queue and never spend it twice.
    const balances = wallet
      ? await this.ledger.lock([wallet, `escrow:${row.id}`, `deposit:${row.id}`, 'platform:revenue'], tx)
      : null;
    return {
      now,
      settings,
      ...(event.type === 'ACCEPT' && { blocked: await blockedPeriods(tx, row.listingId, row.id) }),
      ...(wallet && balances && { walletAvailableCents: cents(balances.get(wallet) ?? 0) }),
    };
  }

  /**
   * Asks the domain and saves its answer: the snapshot with `version + 1`, the effects, and a journal
   * entry. A decision that changes nothing (signing twice, a timer not due) saves nothing.
   */
  async decideAndSave(
    tx: Prisma.TransactionClient,
    row: BookingWithParties,
    actor: Actor,
    event: BookingEvent,
    ctx: DecideContext & Partial<Pick<EffectContext, 'charge'>>,
  ): Promise<Saved> {
    const before = toSnapshot(row);
    const { next, effects } = decide(before, actor, event, ctx);
    if (next === before) return { next, after: nothingAfter(), changed: false };
    const updated = await tx.booking.updateMany({
      where: { id: row.id, version: row.version },
      data: { ...snapshotData(next), version: { increment: 1 } },
    });
    if (updated.count !== 1) throw staleBooking(row.version + 1);
    const done = await this.effects.run(
      tx,
      { row, settings: ctx.settings, now: ctx.now, ...(ctx.charge && { charge: ctx.charge }) },
      next,
      effects,
    );
    await tx.bookingEvent.create({
      data: {
        bookingId: row.id,
        type: event.type,
        actorKind: actor.kind,
        actorId: actor.kind === 'SYSTEM' ? null : actor.userId,
        fromStatus: before.status,
        toStatus: next.status,
        data: journalData(event),
        messages: done.messages,
        createdAt: ctx.now,
      },
    });
    return { next, after: done.after, changed: true };
  }

  /** The deal as `user` sees it; 404 when it is not theirs. */
  async view(id: string, user: Pick<PublicUser, 'id' | 'role'>): Promise<BookingView> {
    const row = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!row) throw bookingNotFound();
    const actor = actorFor(row, user);
    if (actor === null) throw bookingNotFound();
    return this.serialize(row, actor);
  }

  /** The deal's journal, oldest first, for its sides and administrators (404 to anyone else). */
  async history(id: string, user: Pick<PublicUser, 'id' | 'role'>): Promise<BookingHistoryResponse> {
    const row = await this.prisma.booking.findUnique({ where: { id }, select: { renterId: true, ownerId: true } });
    if (!row || actorFor(row, user) === null) throw bookingNotFound();
    const events = await this.prisma.bookingEvent.findMany({
      where: { bookingId: id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { type: true, actorKind: true, fromStatus: true, toStatus: true, createdAt: true },
    });
    return {
      items: events.map((e) => ({
        type: e.type,
        actor: e.actorKind as BookingHistoryResponse['items'][number]['actor'],
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        at: e.createdAt.toISOString(),
      })),
    };
  }

  /** Open deals and those waiting for the user's step, per side (the tabs of "My deals"). */
  async summaryMine(user: PublicUser): Promise<MyBookingsSummary> {
    const rows = await this.prisma.booking.findMany({
      where: {
        OR: [{ renterId: user.id }, { ownerId: user.id }],
        status: { notIn: [...CLOSED_BOOKING_STATUSES] },
      },
      include: BOOKING_INCLUDE,
    });
    const settings = await this.rules.settings();
    const summary: MyBookingsSummary = { renter: { open: 0, needsAction: 0 }, owner: { open: 0, needsAction: 0 } };
    for (const row of rows) {
      const actor = actorFor(row, user)!;
      const side = actor.kind === 'RENTER' ? summary.renter : summary.owner;
      side.open += 1;
      if ((await this.serialize(row, actor, settings)).actions.length > 0) side.needsAction += 1;
    }
    return summary;
  }

  async listMine(
    user: PublicUser,
    role: 'renter' | 'owner',
    status?: BookingStatus,
    page = 1,
    group?: BookingGroup,
  ): Promise<BookingsPage> {
    const closed = [...CLOSED_BOOKING_STATUSES];
    const where: Prisma.BookingWhereInput = {
      [role === 'renter' ? 'renterId' : 'ownerId']: user.id,
      ...(status
        ? { status }
        : group === 'open'
          ? { status: { notIn: closed } }
          : group === 'closed'
            ? { status: { in: closed } }
            : {}),
    };
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
    const settings = await this.rules.settings();
    const items: BookingView[] = [];
    for (const row of rows) items.push(await this.serialize(row, actorFor(row, user)!, settings));
    return { items, total };
  }

  /** The view with the actions `actor` may take now (ACCEPT needs the days other deals hold). */
  async serialize(row: BookingWithParties, actor: Actor, settings?: BookingSettings): Promise<BookingView> {
    const s = toSnapshot(row);
    const ctx: DecideContext = {
      now: this.clock.now(),
      settings: settings ?? (await this.rules.settings()),
      ...(s.status === 'REQUESTED' &&
        actor.kind === 'OWNER' && { blocked: await blockedPeriods(this.prisma, row.listingId, row.id) }),
    };
    const role = actor.kind === 'SYSTEM' ? 'ADMIN' : actor.kind;
    return serializeBooking(row, s, role, availableActions(s, actor, ctx), this.urlFor);
  }

  /** Work a committed decision left: money back to cards, then the emails. */
  async afterCommit(after: AfterCommit): Promise<void> {
    for (const refund of after.refunds) await this.moneyOut.processRefund(refund);
    await this.notifier.booking(after.notices);
  }

  /** The snapshot of a stored deal. */
  snapshot(row: Parameters<typeof toSnapshot>[0]): BookingSnapshot {
    return toSnapshot(row);
  }
}
