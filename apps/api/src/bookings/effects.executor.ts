import { Injectable } from '@nestjs/common';
import type { BookingSnapshot, BookingTemplate, Effect, Recipient } from '@yoyo/domain';
import type { Prisma } from '../generated/prisma/client';

/** A deal email to send once the transaction has committed. */
export interface DealNotice {
  bookingId: string;
  to: Recipient;
  template: BookingTemplate;
}

/** What a decision left to do after the commit. */
export interface AfterCommit {
  notices: DealNotice[];
}

/**
 * Carries out the effects of one decision of @yoyo/domain inside the transaction that saves it, in the
 * domain's order. Whatever must not happen unless the transaction commits (emails, money sent out) is
 * returned as `AfterCommit`.
 */
@Injectable()
export class EffectsExecutor {
  async run(
    tx: Prisma.TransactionClient,
    before: BookingSnapshot | null,
    next: BookingSnapshot,
    effects: readonly Effect[],
  ): Promise<{ messages: BookingTemplate[]; after: AfterCommit }> {
    const messages: BookingTemplate[] = [];
    const after: AfterCommit = { notices: [] };
    for (const effect of effects) {
      switch (effect.kind) {
        case 'SCHEDULE':
        case 'CANCEL_TIMER':
          // The armed timer is part of the snapshot (timerKind, timerDueAt), saved with it.
          break;
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
    void tx;
    void before;
    return { messages, after };
  }
}
