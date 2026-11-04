import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BookingSettings, BookingSnapshot, BookingTemplate, Effect, Recipient } from '@yoyo/domain';
import { AppError } from '../common/app-error';
import type { Prisma } from '../generated/prisma/client';
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

/** The contract's terms as they stand when the owner accepts; later edits of the listing do not change them. */
export function contractTerms(row: BookingWithParties, next: BookingSnapshot, settings: BookingSettings, now: Date) {
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

export type ContractTerms = ReturnType<typeof contractTerms>;

/**
 * Carries out the effects of one decision of @yoyo/domain inside the transaction that saves it, in the
 * domain's order. Whatever must not happen unless the transaction commits (emails, money sent out) is
 * returned as `AfterCommit`.
 */
@Injectable()
export class EffectsExecutor {
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
          await tx.contract.create({ data: { bookingId: next.id, terms, termsHash, createdAt: ctx.now } });
          break;
        }
        case 'SYSTEM_MESSAGE':
          messages.push(effect.template);
          break;
        case 'NOTIFY':
          after.notices.push({ bookingId: next.id, to: effect.to, template: effect.template });
          break;
        default:
          throw new Error(`effect ${effect.kind} of booking ${next.id} is not supported yet`);
      }
    }
    return { messages, after };
  }
}
