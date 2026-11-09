import { cents, localDate, period, type BookingSnapshot, type Quote, type TimerKind } from '@yoyo/domain';
import type { Booking, Prisma } from '../generated/prisma/client';

/** A `@db.Date` column as the domain's day. */
export const dayOf = (date: Date) => localDate(date.toISOString().slice(0, 10));

/** The domain's day as a `@db.Date` value. */
export const dateOf = (day: string) => new Date(`${day}T00:00:00Z`);

const opt = <K extends string, V>(key: K, value: V | null): { [P in K]?: V } =>
  (value === null ? {} : { [key]: value }) as { [P in K]?: V };

/** The domain snapshot of a stored booking. Fields the domain leaves out stay out (no `undefined`). */
export function toSnapshot(row: Booking): BookingSnapshot {
  const quote: Quote = {
    days: row.days,
    dailyCents: cents(row.dailyCents),
    baseCents: cents(row.baseCents),
    discountPercent: row.discountPercent,
    discountCents: cents(row.discountCents),
    rentCents: cents(row.rentCents),
    servicePercent: row.servicePercent,
    serviceFeeCents: cents(row.serviceFeeCents),
    servicePromoUntil: row.servicePromoUntil ? dayOf(row.servicePromoUntil) : null,
    depositCents: cents(row.depositCents),
    totalCents: cents(row.totalCents),
    ownerPayoutCents: cents(row.ownerPayoutCents),
    priceSource: row.priceSource,
  };
  const timers: Partial<Record<TimerKind, Date>> = row.timerKind && row.timerDueAt ? { [row.timerKind]: row.timerDueAt } : {};
  return {
    id: row.id,
    listingId: row.listingId,
    renterId: row.renterId,
    ownerId: row.ownerId,
    status: row.status,
    period: period(dayOf(row.start), dayOf(row.end)),
    timeZone: row.timeZone,
    quote,
    ...opt('renterSignedAt', row.renterSignedAt),
    ...opt('ownerSignedAt', row.ownerSignedAt),
    ...opt('paymentMethod', row.paymentMethod),
    ...opt('ownerHandedOverAt', row.ownerHandedOverAt),
    ...opt('renterReceivedAt', row.renterReceivedAt),
    ...opt('renterReturnedAt', row.renterReturnedAt),
    ...opt('ownerReceivedBackAt', row.ownerReceivedBackAt),
    ...opt('declineReason', row.declineReason),
    ...(row.damageDescription !== null &&
      row.damageClaimedAt !== null && {
        damage: { description: row.damageDescription, photoIds: row.damagePhotoIds, claimedAt: row.damageClaimedAt },
      }),
    ...(row.disputeReason !== null &&
      row.disputeOpenedAt !== null && {
        dispute: {
          reason: row.disputeReason,
          openedAt: row.disputeOpenedAt,
          ...opt('note', row.disputeNote),
          ...(row.resolutionDecision !== null &&
            row.resolvedAt !== null && {
              resolution: {
                decision: row.resolutionDecision,
                comment: row.resolutionComment ?? '',
                by: row.resolvedById ?? '',
                at: row.resolvedAt,
              },
            }),
        },
      }),
    ...opt('outcome', row.outcome),
    ...(row.cancelledBy !== null &&
      row.cancelledAt !== null && {
        cancellation: { by: row.cancelledBy, ...opt('reason', row.cancelReason), at: row.cancelledAt },
      }),
    timers,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...opt('completedAt', row.completedAt),
  };
}

/**
 * The columns that hold a snapshot: everything the domain may change. The id, parties, listing,
 * price and creation time are written once, with the request. A booking holds at most one timer.
 */
export function snapshotData(s: BookingSnapshot) {
  const armed = Object.entries(s.timers) as [TimerKind, Date][];
  if (armed.length > 1) throw new Error(`booking ${s.id} has ${armed.length} timers armed; the domain allows one`);
  const [timer] = armed;
  return {
    status: s.status,
    start: dateOf(s.period.start),
    end: dateOf(s.period.end),
    timeZone: s.timeZone,
    days: s.quote.days,
    dailyCents: s.quote.dailyCents,
    baseCents: s.quote.baseCents,
    discountPercent: s.quote.discountPercent,
    discountCents: s.quote.discountCents,
    rentCents: s.quote.rentCents,
    servicePercent: s.quote.servicePercent,
    serviceFeeCents: s.quote.serviceFeeCents,
    servicePromoUntil: s.quote.servicePromoUntil ? dateOf(s.quote.servicePromoUntil) : null,
    depositCents: s.quote.depositCents,
    totalCents: s.quote.totalCents,
    ownerPayoutCents: s.quote.ownerPayoutCents,
    priceSource: s.quote.priceSource,
    renterSignedAt: s.renterSignedAt ?? null,
    ownerSignedAt: s.ownerSignedAt ?? null,
    paymentMethod: s.paymentMethod ?? null,
    ownerHandedOverAt: s.ownerHandedOverAt ?? null,
    renterReceivedAt: s.renterReceivedAt ?? null,
    renterReturnedAt: s.renterReturnedAt ?? null,
    ownerReceivedBackAt: s.ownerReceivedBackAt ?? null,
    declineReason: s.declineReason ?? null,
    damageDescription: s.damage?.description ?? null,
    damagePhotoIds: [...(s.damage?.photoIds ?? [])],
    damageClaimedAt: s.damage?.claimedAt ?? null,
    disputeReason: s.dispute?.reason ?? null,
    disputeOpenedAt: s.dispute?.openedAt ?? null,
    disputeNote: s.dispute?.note ?? null,
    resolutionDecision: s.dispute?.resolution?.decision ?? null,
    resolutionComment: s.dispute?.resolution?.comment ?? null,
    resolvedById: s.dispute?.resolution?.by ?? null,
    resolvedAt: s.dispute?.resolution?.at ?? null,
    outcome: s.outcome ?? null,
    cancelledBy: s.cancellation?.by ?? null,
    cancelReason: s.cancellation?.reason ?? null,
    cancelledAt: s.cancellation?.at ?? null,
    timerKind: timer?.[0] ?? null,
    timerDueAt: timer?.[1] ?? null,
    updatedAt: s.updatedAt,
    completedAt: s.completedAt ?? null,
  } satisfies Prisma.BookingUncheckedUpdateInput;
}
