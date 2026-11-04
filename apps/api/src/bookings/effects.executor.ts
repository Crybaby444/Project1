import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BookingSettings, BookingSnapshot, BookingTemplate, Effect, Recipient } from '@yoyo/domain';
import { AppError } from '../common/app-error';
import type { Prisma } from '../generated/prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import type { BookingWithParties } from './booking.serializer';

/** A deal email to send once the transaction has committed. */
export interface DealNotice {
  bookingId: string;
  to: Recipient;
  template: BookingTemplate;
}

/** What a decision left to do after the commit. */
export interface AfterCommit {
  notices: DealNotice[];
  /** PaymentRefund rows to send to the provider. */
  refunds: string[];
}

export const nothingAfter = (): AfterCommit => ({ notices: [], refunds: [] });

export interface EffectContext {
  /** The booking as loaded before the decision, with its listing and parties. */
  row: BookingWithParties;
  settings: BookingSettings;
  now: Date;
  /** The card charge that pays this booking (PAY by card), recorded with its ledger operation. */
  charge?: { ref: string; brand: string; last4: string };
}

/** True for PostgreSQL's 23P01: the reservation overlaps another one of the same listing. */
export function isDoubleBooking(error: unknown): boolean {
  const text = `${String(error)} ${JSON.stringify((error as { meta?: unknown })?.meta ?? {})} ${String((error as { cause?: unknown })?.cause ?? '')}`;
  return text.includes('23P01') || text.includes('Booking_no_double_booking');
}

/** JSON with sorted keys: the same terms always hash the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** The contract's terms as stored (plain JSON): what both sides agreed to when the owner accepted. */
export interface ContractTerms {
  contractId: string;
  acceptedAt: string;
  renter: { id: string; name: string; email: string };
  owner: { id: string; name: string; email: string };
  listing: {
    id: string;
    title: string;
    condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | null;
    city: string | null;
    district: string | null;
    rules: { preset: string[]; custom: string[] };
  };
  period: { start: string; end: string };
  timeZone: string;
  quote: { [K in keyof BookingSnapshot['quote']]: K extends 'priceSource' ? 'LISTED' | 'AGREED' : number };
  deadlines: { handoverConfirmHours: number; returnConfirmHours: number; inspectionHours: number; damageReplyHours: number };
}

/** The contract's terms as they stand when the owner accepts; later edits of the listing do not change them. */
export function contractTerms(row: BookingWithParties, next: BookingSnapshot, settings: BookingSettings, now: Date): ContractTerms {
  const rules = (row.listing.rules ?? { preset: [], custom: [] }) as { preset: string[]; custom: string[] };
  return {
    contractId: next.id,
    acceptedAt: now.toISOString(),
    renter: { id: row.renter.id, name: row.renter.name, email: row.renter.email },
    owner: { id: row.owner.id, name: row.owner.name, email: row.owner.email },
    listing: {
      id: row.listing.id,
      title: row.listing.title ?? '',
      condition: row.listing.condition,
      city: row.listing.city,
      district: row.listing.district,
      rules: { preset: [...rules.preset], custom: [...rules.custom] },
    },
    period: { start: next.period.start, end: next.period.end },
    timeZone: next.timeZone,
    quote: { ...next.quote },
    deadlines: {
      handoverConfirmHours: settings.handoverConfirmHours,
      returnConfirmHours: settings.returnConfirmHours,
      inspectionHours: settings.inspectionHours,
      damageReplyHours: settings.damageReplyHours,
    },
  };
}


/**
 * Carries out the effects of one decision of @yoyo/domain inside the transaction that saves it, in the
 * domain's order. Whatever must not happen unless the transaction commits (emails, money sent out) is
 * returned as `AfterCommit`.
 */
@Injectable()
export class EffectsExecutor {
  constructor(private readonly ledger: LedgerService) {}

  async run(
    tx: Prisma.TransactionClient,
    ctx: EffectContext,
    next: BookingSnapshot,
    effects: readonly Effect[],
  ): Promise<{ messages: BookingTemplate[]; after: AfterCommit }> {
    const messages: BookingTemplate[] = [];
    const after = nothingAfter();
    for (const effect of effects) {
      switch (effect.kind) {
        case 'SCHEDULE':
        case 'CANCEL_TIMER':
          // The armed timer is part of the snapshot (timerKind, timerDueAt), saved with it.
          break;
        case 'RESERVE_DATES':
          try {
            await tx.$executeRaw`UPDATE "Booking" SET reserved = daterange("start", "end", '[]') WHERE id = ${next.id}`;
          } catch (error) {
            if (isDoubleBooking(error)) throw new AppError('DATES_UNAVAILABLE', 409, 'Another booking took some of these days');
            throw error;
          }
          break;
        case 'RELEASE_DATES':
          await tx.$executeRaw`UPDATE "Booking" SET reserved = NULL WHERE id = ${next.id}`;
          break;
        case 'GENERATE_CONTRACT': {
          const terms = contractTerms(ctx.row, next, ctx.settings, ctx.now);
          const termsHash = createHash('sha256').update(canonicalJson(terms)).digest('hex');
          await tx.contract.create({ data: { bookingId: next.id, terms: terms as unknown as Prisma.InputJsonObject, termsHash, createdAt: ctx.now } });
          break;
        }
        case 'LEDGER': {
          await this.ledger.post(effect.operation, tx);
          const card = effect.operation.postings.find((posting) => posting.account === 'external:card');
          if (card === undefined) break;
          if (effect.operation.kind === 'BOOKING_PAYMENT') {
            if (!ctx.charge) throw new Error(`card payment of booking ${next.id} without a charge`);
            await tx.payment.create({
              data: {
                userId: next.renterId,
                bookingId: next.id,
                purpose: 'BOOKING',
                amountCents: -card.amount,
                providerRef: ctx.charge.ref,
                brand: ctx.charge.brand,
                last4: ctx.charge.last4,
                createdAt: ctx.now,
              },
            });
          } else if (card.amount > 0) {
            // Money goes back the way it came (spec §0): a refund of the booking's card payment.
            const payment = await tx.payment.findFirstOrThrow({ where: { bookingId: next.id, purpose: 'BOOKING' } });
            await tx.payment.update({ where: { id: payment.id }, data: { refundedCents: { increment: card.amount } } });
            const refund = await tx.paymentRefund.create({ data: { paymentId: payment.id, amountCents: card.amount, createdAt: ctx.now } });
            after.refunds.push(refund.id);
          }
          break;
        }
        case 'SYSTEM_MESSAGE':
          messages.push(effect.template);
          break;
        case 'NOTIFY':
          after.notices.push({ bookingId: next.id, to: effect.to, template: effect.template });
          break;
        default: {
          const unknown: never = effect;
          throw new Error(`unknown effect ${JSON.stringify(unknown)} of booking ${next.id}`);
        }
      }
    }
    return { messages, after };
  }
}
