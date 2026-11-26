import { Inject, Injectable } from '@nestjs/common';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { DealNotifier } from '../bookings/deal-notifier';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** ISO instant `hours` from `now` (negative: before it). */
const shifted = (now: Date, hours: number) => new Date(now.getTime() + hours * HOUR).toISOString();

/**
 * Reminders (spec 2026-11-03 §4.7: «напоминания о передаче и возврате»), in the bell and by email (the
 * DEALS topic):
 * - the handover: both people of a paid deal, the day before its first day;
 * - the return: both people of an active deal, the day before its last day;
 * - a request or a booking that expires in less than 6 hours: whoever's turn it is (the owner answers or
 *   countersigns, the renter signs and pays), so fewer deals end only because a message was missed;
 * - a review: the sides of a completed deal that have not reviewed it, 3 days after, while a day of the
 *   review window is left (reviews are how people nearby come to trust each other).
 *
 * Days and hours are the deal's own (its `timeZone`). The handover, return and review reminders go
 * between 10:00 and 21:00 there, never at night; a nudge before a deadline goes when it is due. A deal
 * that changed in the last 12 hours (just paid, just handed over) gets no handover or return reminder:
 * its people have just heard from Yoyo, and that step's own email gives the dates. A turn is nudged
 * once it has waited 2 hours, and once only: a later step (`updatedAt`) makes a new turn.
 *
 * Each statement that picks deals also marks them (`startRemindedAt`, `endRemindedAt`,
 * `deadlineRemindedAt`, `reviewRemindedAt`), with SKIP LOCKED, so a reminder goes once even when two
 * runs overlap, and a deal that moved on meanwhile is not picked. Timestamps are stored as UTC wall time
 * (Prisma's TIMESTAMP(3)), rental days as the deal's local dates. Marking leaves `version` and
 * `updatedAt` alone: a reminder is not a step of the deal.
 */
@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: DealNotifier,
    private readonly rules: BookingRulesService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Sends the reminders that are due; returns how many deals were reminded. */
  async sendDue(): Promise<number> {
    const now = this.clock.now();
    return (await this.handovers(now)) + (await this.returns(now)) + (await this.turns(now)) + (await this.reviews(now));
  }

  private async handovers(now: Date): Promise<number> {
    const at = now.toISOString();
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Booking" SET "startRemindedAt" = (${at}::timestamptz AT TIME ZONE 'UTC')
      WHERE id IN (
        SELECT id FROM "Booking"
        WHERE status = 'PAID'
          AND "startRemindedAt" IS NULL
          AND "start" = (${at}::timestamptz AT TIME ZONE "timeZone")::date + 1
          AND extract(hour FROM ${at}::timestamptz AT TIME ZONE "timeZone") BETWEEN 10 AND 20
          AND "updatedAt" < (${shifted(now, -12)}::timestamptz AT TIME ZONE 'UTC')
        ORDER BY id
        LIMIT 200
        FOR UPDATE SKIP LOCKED)
      RETURNING id`;
    for (const { id } of rows) {
      await this.notifier.booking([
        { bookingId: id, to: 'RENTER', template: 'REMINDER_START' },
        { bookingId: id, to: 'OWNER', template: 'REMINDER_START' },
      ]);
    }
    return rows.length;
  }

  private async returns(now: Date): Promise<number> {
    const at = now.toISOString();
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Booking" SET "endRemindedAt" = (${at}::timestamptz AT TIME ZONE 'UTC')
      WHERE id IN (
        SELECT id FROM "Booking"
        WHERE status = 'ACTIVE'
          AND "endRemindedAt" IS NULL
          AND "end" = (${at}::timestamptz AT TIME ZONE "timeZone")::date + 1
          AND extract(hour FROM ${at}::timestamptz AT TIME ZONE "timeZone") BETWEEN 10 AND 20
          AND "updatedAt" < (${shifted(now, -12)}::timestamptz AT TIME ZONE 'UTC')
        ORDER BY id
        LIMIT 200
        FOR UPDATE SKIP LOCKED)
      RETURNING id`;
    for (const { id } of rows) {
      await this.notifier.booking([
        { bookingId: id, to: 'RENTER', template: 'REMINDER_END' },
        { bookingId: id, to: 'OWNER', template: 'REMINDER_END' },
      ]);
    }
    return rows.length;
  }

  /** A request or a booking about to expire: whoever's turn it is. */
  private async turns(now: Date): Promise<number> {
    const at = now.toISOString();
    const rows = await this.prisma.$queryRaw<{ id: string; requested: boolean; renterSigned: boolean; ownerSigned: boolean }[]>`
      UPDATE "Booking" b SET "deadlineRemindedAt" = (${at}::timestamptz AT TIME ZONE 'UTC')
      WHERE b.id IN (
        SELECT id FROM "Booking"
        WHERE status IN ('REQUESTED', 'ACCEPTED')
          AND "timerKind" IN ('REQUEST_EXPIRY', 'PAYMENT_EXPIRY')
          AND "timerDueAt" > (${at}::timestamptz AT TIME ZONE 'UTC')
          AND "timerDueAt" <= (${shifted(now, 6)}::timestamptz AT TIME ZONE 'UTC')
          AND "updatedAt" <= (${shifted(now, -2)}::timestamptz AT TIME ZONE 'UTC')
          AND ("deadlineRemindedAt" IS NULL OR "deadlineRemindedAt" < "updatedAt")
        ORDER BY "timerDueAt", id
        LIMIT 200
        FOR UPDATE SKIP LOCKED)
      RETURNING b.id, b.status = 'REQUESTED' AS requested, b."renterSignedAt" IS NOT NULL AS "renterSigned",
        b."ownerSignedAt" IS NOT NULL AS "ownerSigned"`;
    for (const deal of rows) {
      // The renter signs first, then the owner countersigns, then the renter pays (owner, 2026-11-15).
      const notice = deal.requested
        ? ({ to: 'OWNER', template: 'REMINDER_ANSWER' } as const)
        : deal.renterSigned && !deal.ownerSigned
          ? ({ to: 'OWNER', template: 'REMINDER_SIGN' } as const)
          : ({ to: 'RENTER', template: 'REMINDER_PAY' } as const);
      await this.notifier.booking([{ bookingId: deal.id, ...notice }]);
    }
    return rows.length;
  }

  /** Three days after a deal is completed, while at least a day of the review window is left. */
  private async reviews(now: Date): Promise<number> {
    const at = now.toISOString();
    const { reviewWindowDays } = await this.rules.settings();
    const dayLeftAfter = new Date(now.getTime() - (reviewWindowDays - 1) * DAY).toISOString();
    const rows = await this.prisma.$queryRaw<{ id: string; renterId: string; ownerId: string }[]>`
      UPDATE "Booking" b SET "reviewRemindedAt" = (${at}::timestamptz AT TIME ZONE 'UTC')
      WHERE b.id IN (
        SELECT id FROM "Booking"
        WHERE status = 'COMPLETED'
          AND "reviewRemindedAt" IS NULL
          AND "completedAt" <= (${shifted(now, -3 * 24)}::timestamptz AT TIME ZONE 'UTC')
          AND "completedAt" > (${dayLeftAfter}::timestamptz AT TIME ZONE 'UTC')
          AND extract(hour FROM ${at}::timestamptz AT TIME ZONE "timeZone") BETWEEN 10 AND 20
        ORDER BY "completedAt", id
        LIMIT 200
        FOR UPDATE SKIP LOCKED)
      RETURNING b.id, b."renterId", b."ownerId"`;
    const written = await this.prisma.review.findMany({
      where: { bookingId: { in: rows.map((deal) => deal.id) } },
      select: { bookingId: true, authorId: true },
    });
    const wrote = (bookingId: string, userId: string) => written.some((r) => r.bookingId === bookingId && r.authorId === userId);
    for (const deal of rows) {
      const sides = [
        ...(wrote(deal.id, deal.renterId) ? [] : [{ bookingId: deal.id, to: 'RENTER', template: 'REMINDER_REVIEW' } as const]),
        ...(wrote(deal.id, deal.ownerId) ? [] : [{ bookingId: deal.id, to: 'OWNER', template: 'REMINDER_REVIEW' } as const]),
      ];
      if (sides.length > 0) await this.notifier.booking(sides);
    }
    return rows.length;
  }
}
