import {
  availableActions,
  cents,
  createRequest,
  decide,
  DEFAULT_BOOKING_SETTINGS,
  endOfDayIn,
  localDate,
  period,
  type Actor,
  type BookingEvent,
  type BookingEventType,
  type BookingSnapshot,
  type DecideContext,
  type TimerKind,
} from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import en from './i18n/en.json';
import lv from './i18n/lv.json';
import ru from './i18n/ru.json';
import { DEAL_PLACEHOLDERS, dealRole } from './templates/deal-texts';

const RENTER: Actor = { kind: 'RENTER', userId: 'renter' };
const OWNER: Actor = { kind: 'OWNER', userId: 'owner' };
const ADMIN: Actor = { kind: 'ADMIN', userId: 'admin' };
const SYSTEM: Actor = { kind: 'SYSTEM' };

function sample(type: BookingEventType, s: BookingSnapshot): BookingEvent[] {
  switch (type) {
    case 'DECLINE':
    case 'CANCEL':
      return [{ type, reason: 'Some reason' } as BookingEvent];
    case 'REPORT_NOT_RECEIVED':
    case 'REPORT_NOT_RETURNED':
    case 'REJECT_DAMAGE':
      return [{ type, note: 'Some note' } as BookingEvent];
    case 'PAY':
      return [{ type, method: 'CARD' }];
    case 'REPORT_DAMAGE':
      return [{ type, description: 'The chuck is cracked.', photoIds: ['p1'] }];
    case 'RESOLVE':
      return (['REFUND_DEPOSIT', 'DEPOSIT_TO_OWNER', 'REFUND_ALL', 'CONFIRM_HANDOVER'] as const).map((decision) => ({ type, decision, comment: 'Decided' }));
    case 'TIMEOUT':
      return (Object.keys(s.timers) as TimerKind[]).map((timer) => ({ type, timer }));
    default:
      return [{ type } as BookingEvent];
  }
}

/** Every (template, recipient) the domain can email about, found by walking many deal paths. */
function notifyPairs(): Set<string> {
  const now0 = new Date('2027-03-01T08:00:00Z');
  const start = localDate('2027-03-03');
  const first = createRequest(
    {
      id: 'b',
      listingId: 'l',
      renterId: 'renter',
      ownerId: 'owner',
      period: period(start, localDate('2027-03-05')),
      timeZone: 'Europe/Riga',
      pricing: { dailyCents: cents(1500), weeklyDiscountPercent: 0, depositCents: cents(5000), minDays: 1, maxDays: 30 },
      blocked: [],
    },
    { now: now0, settings: DEFAULT_BOOKING_SETTINGS },
  );
  const pairs = new Set(first.effects.flatMap((e) => (e.kind === 'NOTIFY' ? [`${e.template}/${e.to}`] : [])));
  const seen = new Set<string>();
  const queue: BookingSnapshot[] = [first.next];
  while (queue.length > 0 && seen.size < 5000) {
    const s = queue.shift()!;
    const key = JSON.stringify(s);
    if (seen.has(key)) continue;
    seen.add(key);
    const due = Object.values(s.timers)[0];
    const moments = [
      new Date(s.updatedAt.getTime() + 60_000),
      new Date(endOfDayIn(start, 'Europe/Riga').getTime() - 3_600_000),
      new Date(endOfDayIn(localDate('2027-03-07'), 'Europe/Riga').getTime()),
      ...(due ? [new Date(due.getTime() + 1)] : []),
    ].filter((m) => m.getTime() > s.updatedAt.getTime() || m.getTime() === s.updatedAt.getTime());
    for (const now of moments) {
      const ctx: DecideContext = { now, settings: DEFAULT_BOOKING_SETTINGS, blocked: [], walletAvailableCents: cents(1_000_000) };
      for (const actor of [RENTER, OWNER, ADMIN, SYSTEM]) {
        for (const type of availableActions(s, actor, ctx)) {
          for (const event of sample(type, s)) {
            try {
              const { next, effects } = decide(s, actor, event, ctx);
              for (const e of effects) if (e.kind === 'NOTIFY') pairs.add(`${e.template}/${e.to}`);
              if (next !== s) queue.push(next);
            } catch {
              // Data the domain refuses: not a path.
            }
          }
        }
      }
    }
  }
  return pairs;
}

const LANGS = { en, lv, ru } as const;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe('deal email texts', () => {
  const pairs = notifyPairs();

  it('the walk reaches every email the transition table can send', () => {
    expect([...pairs].sort()).toEqual(
      [
        'REQUESTED/OWNER',
        'ACCEPTED/RENTER',
        'DECLINED/RENTER',
        'CANCELLED/RENTER',
        'CANCELLED/OWNER',
        'EXPIRED/RENTER',
        'EXPIRED/OWNER',
        'PAID/OWNER',
        'HANDED_OVER/RENTER',
        'RECEIVED/OWNER',
        'RECEIVED/RENTER',
        'RETURNED/OWNER',
        'RECEIVED_BACK/RENTER',
        'RECEIVED_BACK/OWNER',
        'ALL_FINE/RENTER',
        'ALL_FINE/OWNER',
        'DAMAGE_REPORTED/RENTER',
        'DAMAGE_ACCEPTED/OWNER',
        'DISPUTE_OPENED/ADMINS',
        'DISPUTE_OPENED/OWNER',
        'DISPUTE_OPENED/RENTER',
        'DISPUTE_RESOLVED/RENTER',
        'DISPUTE_RESOLVED/OWNER',
      ].sort(),
    );
  });

  it('has a subject, preview, heading and body for each of them in English, Latvian and Russian', () => {
    for (const pair of [...pairs, 'OFFER_MADE/OWNER', 'OFFER_ACCEPTED/RENTER', 'OFFER_DECLINED/RENTER']) {
      const [template, to] = pair.split('/') as [string, string];
      const role = dealRole(to as 'RENTER' | 'OWNER' | 'ADMINS');
      const english = (en.deal as unknown as Record<string, Record<string, Record<string, string>>>)[template]?.[role];
      for (const [lang, texts] of Object.entries(LANGS)) {
        const entry = (texts.deal as unknown as Record<string, Record<string, Record<string, string>>>)[template]?.[role];
        expect({ pair, lang, has: entry !== undefined }).toEqual({ pair, lang, has: true });
        for (const field of ['subject', 'preview', 'heading', 'body']) {
          expect({ pair, lang, field, text: (entry?.[field] ?? '').trim().length > 0 }).toEqual({ pair, lang, field, text: true });
          const used = placeholders(entry![field]!);
          expect(used.filter((p) => !(DEAL_PLACEHOLDERS as readonly string[]).includes(p))).toEqual([]);
          expect({ pair, lang, field, used }).toEqual({ pair, lang, field, used: placeholders(english![field]!) });
        }
      }
    }
  });
});
