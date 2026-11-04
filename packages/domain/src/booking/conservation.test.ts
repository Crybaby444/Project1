import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays, endOfDayIn, localDateIn, period } from '../dates';
import { DomainError } from '../errors';
import { applyOperation, assertBalanced, topUp } from '../ledger';
import type { AccountId, PaymentMethod } from '../ledger';
import { cents } from '../money';
import { DEFAULT_BOOKING_SETTINGS } from '../settings';
import { availableActions } from './actions';
import { decide } from './decide';
import { createRequest } from './request';
import { OWNER_ID, RENTER_ID, SAMPLE, admin, owner, renter, system } from './test-support';
import { TIMER_KINDS, isTerminal } from './types';
import type {
  Actor,
  BookingEvent,
  BookingEventType,
  BookingSnapshot,
  DecideContext,
  Decision,
  Effect,
  TimerKind,
} from './types';

/**
 * Review Focus 1, money conservation. A random booking (price, deposit, often 0, payment method, how
 * much is in the renter's wallet) walks a random path to its end: at each step a random side does
 * one of its available actions, a random armed timer fires once its time has come, or time passes.
 * Leaving early (decline, withdraw, cancel) is less likely than going on, so long paths get walked;
 * the test then checks that every kind of ending was actually reached, including each timer's own
 * ending and a "not returned" report after the rental is over. Waits sometimes jump past the end of
 * the rental. Between steps the scheduler misfires: a TIMEOUT for a timer that is not armed or not yet
 * due, and every fired timer once more; none of them may change anything or move money. At the end the
 * renter's wallet and the card are checked too: refunds and the deposit go back the way they were paid.
 */

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const START = new Date('2026-11-04T00:00:00Z');
const MAX_STEPS = 300;
/**
 * 3000 walks: the rarest required ending (a damage claim left unanswered until its deadline) then shows
 * up about 15–30 times per run, so a run that misses it is around a one-in-a-billion event.
 */
const RUNS = 3000;
/**
 * 1000 walks took 5.4 s on a busy CI runner (turbo runs every package at once), past vitest's default
 * 5 s; 3000 longer walks take about 7 s locally. fc.assert is synchronous, so this is a budget, not a
 * cut-off.
 */
const BUDGET_MS = 120_000;

const EXITS: ReadonlySet<BookingEventType> = new Set(['DECLINE', 'WITHDRAW', 'CANCEL']);
const WEIGHT = { exit: 1, action: 6, timer: 1, wait: 1, pastEnd: 3, misfire: 1 } as const;

type Choice =
  | { readonly kind: 'act'; readonly actor: Actor; readonly type: BookingEventType }
  | { readonly kind: 'timer'; readonly timer: TimerKind }
  | { readonly kind: 'wait' }
  | { readonly kind: 'pastEnd' }
  | { readonly kind: 'misfire' };

/**
 * A side that rarely acts once the booking is paid, so its timers come due: the paths that end by a
 * deadline get walked. Drawn again at every status change after payment; before payment both act
 * normally, or most walks would just expire.
 */
const QUIET = ['NOBODY', 'RENTER', 'OWNER', 'BOTH'] as const;
type Quiet = (typeof QUIET)[number];

function weightOf(choice: Choice, quiet: Quiet): number {
  if (choice.kind !== 'act') return WEIGHT[choice.kind];
  if (EXITS.has(choice.type)) return WEIGHT.exit;
  const silent = quiet === 'BOTH' || quiet === choice.actor.kind;
  return silent ? WEIGHT.exit : WEIGHT.action;
}

/** A uniform index: fast-check's integers lean towards their bounds, which would favour the first and last choice. */
const index = (g: fc.GeneratorValue, size: number): number =>
  g(() => fc.noBias(fc.integer({ min: 0, max: size - 1 })));

function pick(choices: readonly Choice[], quiet: Quiet, g: fc.GeneratorValue): Choice {
  const total = choices.reduce((sum, choice) => sum + weightOf(choice, quiet), 0);
  let ticket = index(g, total);
  for (const choice of choices) {
    ticket -= weightOf(choice, quiet);
    if (ticket < 0) return choice;
  }
  throw new Error('no choice');
}

function oneOf<T>(g: fc.GeneratorValue, values: readonly [T, ...T[]]): T {
  return values[index(g, values.length)] ?? values[0];
}

/** A valid event of `type`, with random data where the data matters. */
function eventFor(
  type: BookingEventType,
  s: BookingSnapshot,
  method: PaymentMethod,
  g: fc.GeneratorValue,
): BookingEvent {
  switch (type) {
    case 'DECLINE':
      return oneOf(g, [true, false]) ? { type, reason: 'Busy that week' } : { type };
    case 'PAY':
      return { type, method };
    case 'CANCEL':
      return { type, reason: SAMPLE.reason };
    case 'REPORT_NOT_RECEIVED':
    case 'REPORT_NOT_RETURNED':
    case 'REJECT_DAMAGE':
      return { type, note: SAMPLE.note };
    case 'REPORT_DAMAGE':
      return { type, description: SAMPLE.description, photoIds: SAMPLE.photoIds };
    case 'RESOLVE': {
      const decision =
        s.dispute?.reason === 'NOT_HANDED_OVER'
          ? oneOf(g, ['REFUND_ALL', 'CONFIRM_HANDOVER'] as const)
          : oneOf(g, ['REFUND_DEPOSIT', 'DEPOSIT_TO_OWNER'] as const);
      return { type, decision, comment: SAMPLE.comment };
    }
    case 'TIMEOUT':
      throw new Error('timers are fired as their own choice');
    default:
      return { type };
  }
}

/** How a walk ended, in words the coverage check below uses. */
function endingsOf(s: BookingSnapshot): string[] {
  const paid = s.paymentMethod === undefined ? 'unpaid' : 'paid';
  const endings = [`${s.status} ${s.outcome ?? '-'} ${paid}`];
  if (s.cancellation !== undefined) endings.push(`cancelled by ${s.cancellation.by}`);
  if (s.dispute !== undefined) endings.push(`dispute ${s.dispute.reason}`);
  if (s.paymentMethod !== undefined) endings.push(`paid by ${s.paymentMethod}`);
  if (s.status === 'COMPLETED' && s.quote.depositCents === 0) endings.push('completed without deposit');
  return endings;
}

const scenario = fc.record({
  dailyCents: fc.integer({ min: 100, max: 1_000_000 }),
  weeklyDiscountPercent: fc.integer({ min: 0, max: 90 }),
  depositCents: fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 5_000_000 })),
  days: fc.integer({ min: 1, max: 30 }),
  servicePercent: fc.integer({ min: 0, max: 30 }),
  method: fc.constantFrom<PaymentMethod>('WALLET', 'CARD'),
  /** The renter's wallet before paying, in percent of the total: empty, exact, short or plenty. */
  walletPercentOfTotal: fc.oneof(fc.constant(0), fc.constant(100), fc.integer({ min: 0, max: 200 })),
  hoursAfterStart: fc.integer({ min: 0, max: 47 }),
  /** Often today or tomorrow, so the handover can be marked before its deadline. */
  startsInDays: fc.oneof(fc.constantFrom(0, 1), fc.integer({ min: 0, max: 10 })),
});

describe('money conservation (Review Focus 1)', () => {
  it(
    `keeps every cent accounted for on any path to the end (${RUNS} random bookings)`,
    { timeout: BUDGET_MS },
    () => {
      const reached = new Set<string>();

      fc.assert(
        fc.property(scenario, fc.gen(), (sc, g) => {
          const settings = { ...DEFAULT_BOOKING_SETTINGS, servicePercent: sc.servicePercent };
          let now = new Date(START.getTime() + sc.hoursAfterStart * HOUR_MS);
          const start = addDays(localDateIn(now, 'Europe/Riga'), sc.startsInDays);
          const created = createRequest(
            {
              id: 'booking-1',
              listingId: 'listing-1',
              renterId: RENTER_ID,
              ownerId: OWNER_ID,
              period: period(start, addDays(start, sc.days - 1)),
              timeZone: 'Europe/Riga',
              pricing: {
                dailyCents: cents(sc.dailyCents),
                weeklyDiscountPercent: sc.weeklyDiscountPercent,
                depositCents: cents(sc.depositCents),
                minDays: 1,
                maxDays: 30,
              },
              blocked: [],
            },
            { now, settings },
          );
          let s = created.next;
          let method = sc.method;
          let quiet: Quiet = 'NOBODY';
          const { totalCents, rentCents, serviceFeeCents, depositCents } = s.quote;

          let balances = new Map<AccountId, number>();
          const balance = (account: AccountId) => balances.get(account) ?? 0;
          const walletStart = Math.floor((totalCents * sc.walletPercentOfTotal) / 100);
          if (walletStart > 0) balances = applyOperation(balances, topUp(RENTER_ID, cents(walletStart)));
          const context = (): DecideContext => ({
            now,
            settings,
            blocked: [],
            walletAvailableCents: cents(balance(`wallet:${RENTER_ID}`)),
          });

          /** A TIMEOUT that must be a no-op: same snapshot, no effects, no money. */
          const expectNoop = (timer: TimerKind, label: string) => {
            const d = decide(s, system, { type: 'TIMEOUT', timer }, context());
            expect(d.next, `${label} TIMEOUT ${timer} changes nothing`).toBe(s);
            expect(d.effects, `${label} TIMEOUT ${timer} has no effects`).toEqual([]);
            reached.add(`misfire ${label}`);
          };

          let reserved = 0;
          let released = 0;
          let payments = 0;
          const carryOut = (effects: readonly Effect[]) => {
            for (const effect of effects) {
              if (effect.kind === 'LEDGER') {
                const op = effect.operation;
                assertBalanced(op);
                expect(
                  op.postings.reduce((sum, posting) => sum + posting.amount, 0),
                  `${op.kind} sums to zero`,
                ).toBe(0);
                balances = applyOperation(balances, op); // throws if a wallet, escrow or deposit would go below zero
                if (op.kind === 'BOOKING_PAYMENT') payments += 1;
              }
              if (effect.kind === 'RESERVE_DATES') {
                expect(reserved, 'dates reserved only while free').toBe(released);
                reserved += 1;
              }
              if (effect.kind === 'RELEASE_DATES') {
                released += 1;
                expect(released, 'dates released only once reserved').toBe(reserved);
              }
            }
            for (const [account, amount] of balances) {
              if (account.startsWith('wallet:')) expect(amount, account).toBeGreaterThanOrEqual(0);
            }
          };
          carryOut(created.effects);

          for (let steps = 0; !isTerminal(s.status); steps += 1) {
            expect(steps, 'the booking reaches an end').toBeLessThan(MAX_STEPS);
            const choice = pick(
              [
                ...[renter, owner, admin].flatMap((actor) =>
                  availableActions(s, actor, context()).map((type): Choice => ({ kind: 'act', actor, type })),
                ),
                ...(Object.keys(s.timers) as TimerKind[]).map((timer): Choice => ({ kind: 'timer', timer })),
                { kind: 'wait' },
                ...(s.status === 'ACTIVE' && now.getTime() < endOfDayIn(s.period.end, s.timeZone).getTime()
                  ? [{ kind: 'pastEnd' } as const]
                  : []),
                { kind: 'misfire' },
              ],
              quiet,
              g,
            );

            let decision: Decision;
            if (choice.kind === 'wait') {
              now = new Date(now.getTime() + g(fc.integer, { min: 1, max: 24 }) * HOUR_MS);
              continue;
            } else if (choice.kind === 'pastEnd') {
              // A long wait in an active rental: past its end, where "not returned" can be reported.
              const end = endOfDayIn(s.period.end, s.timeZone).getTime();
              now = new Date(end + g(fc.integer, { min: 0, max: 48 * 60 }) * MINUTE_MS);
              continue;
            } else if (choice.kind === 'misfire') {
              // A scheduler job for a timer that is not armed, or not due yet.
              const timer = oneOf(g, TIMER_KINDS);
              const due = s.timers[timer];
              if (due === undefined) expectNoop(timer, 'unarmed');
              else if (due.getTime() > now.getTime()) expectNoop(timer, 'early');
              continue;
            } else if (choice.kind === 'timer') {
              const due = s.timers[choice.timer];
              if (due === undefined) throw new Error(`${choice.timer} is not armed`);
              const late = g(fc.integer, { min: 0, max: 180 }) * MINUTE_MS;
              now = new Date(Math.max(now.getTime(), due.getTime()) + late);
              decision = decide(s, system, { type: 'TIMEOUT', timer: choice.timer }, context());
              reached.add(`timeout ${choice.timer}`);
            } else {
              const event = eventFor(choice.type, s, method, g);
              try {
                decision = decide(s, choice.actor, event, context());
              } catch (error) {
                // The one refusal of a listed action: a wallet that cannot cover the total. Like a real
                // renter, the next attempt pays by card.
                expect(error).toBeInstanceOf(DomainError);
                expect([event.type, (error as DomainError).code]).toEqual(['PAY', 'INSUFFICIENT_FUNDS']);
                method = 'CARD';
                continue;
              }
            }
            expect(decision.next, 'a listed action or a due timer changes the booking').not.toBe(s);
            if (
              choice.kind === 'act' &&
              choice.type === 'REPORT_NOT_RETURNED' &&
              s.renterReturnedAt === undefined
            ) {
              reached.add('not returned after the rental');
            }
            carryOut(decision.effects);
            expect(Object.keys(decision.next.timers).length, 'at most one armed timer').toBeLessThanOrEqual(
              1,
            );
            // A new step, a new temper: who stays quiet is drawn again once the booking is paid.
            if (decision.next.status !== s.status && decision.next.paymentMethod !== undefined) {
              quiet = oneOf(g, QUIET);
            }
            s = decision.next;
            // The same job again, at once: the timer has fired, so nothing happens.
            if (choice.kind === 'timer' && s.timers[choice.timer] === undefined)
              expectNoop(choice.timer, 'repeated');
          }

          expect(s.timers, 'no timer left at the end').toEqual({});
          expect(balance(`escrow:${s.id}`), 'escrow at the end').toBe(0);
          expect(balance(`deposit:${s.id}`), 'deposit at the end').toBe(0);
          expect(
            [...balances.values()].reduce((sum, amount) => sum + amount, 0),
            'all balances together',
          ).toBe(0);
          expect(released, 'reserved dates released at the end').toBe(reserved);

          const paid = s.paymentMethod !== undefined;
          expect(payments, 'payments made').toBe(paid ? 1 : 0);
          const refunded = s.outcome === 'REFUNDED_ALL' || (s.status === 'CANCELLED' && paid);
          expect(balance('platform:revenue'), 'Yoyo keeps the fee of a paid, unrefunded booking only').toBe(
            paid && !refunded ? serviceFeeCents : 0,
          );
          const ownerEarned =
            s.status === 'COMPLETED' ? rentCents + (s.outcome === 'DEPOSIT_TO_OWNER' ? depositCents : 0) : 0;
          expect(balance(`wallet:${OWNER_ID}`), 'the owner earns the rent and an accepted deposit').toBe(
            ownerEarned,
          );

          // The renter's side: what the renter is out of pocket, and through which account it went.
          const renterCost =
            !paid || refunded
              ? 0
              : rentCents + serviceFeeCents + (s.outcome === 'DEPOSIT_TO_OWNER' ? depositCents : 0);
          const fromWallet = s.paymentMethod === 'WALLET' ? renterCost : 0;
          const fromCard = s.paymentMethod === 'CARD' ? renterCost : 0;
          expect(balance(`wallet:${RENTER_ID}`), `the renter's wallet (${s.paymentMethod ?? 'unpaid'})`).toBe(
            walletStart - fromWallet,
          );
          expect(balance('external:card'), `the card (${s.paymentMethod ?? 'unpaid'})`).toBe(
            0 - walletStart - fromCard,
          );

          for (const ending of endingsOf(s)) reached.add(ending);
        }),
        // Shrinking a 300-step walk takes minutes (fc.assert is synchronous): report the first failure as
        // found; its seed and path replay it.
        { numRuns: RUNS, endOnFailure: true },
      );

      // The walks really went everywhere: otherwise the checks above would pass without being tested.
      expect([...reached].sort()).toEqual(
        expect.arrayContaining([
          'COMPLETED DEPOSIT_REFUNDED paid',
          'COMPLETED DEPOSIT_TO_OWNER paid',
          'CANCELLED REFUNDED_ALL paid',
          'CANCELLED - unpaid',
          'DECLINED - unpaid',
          'EXPIRED - unpaid',
          'cancelled by ADMIN',
          'cancelled by OWNER',
          'cancelled by RENTER',
          'dispute DAMAGE',
          'dispute NOT_RETURNED',
          'dispute NOT_HANDED_OVER',
          'paid by CARD',
          'paid by WALLET',
          'completed without deposit',
          ...TIMER_KINDS.map((timer) => `timeout ${timer}`),
          'not returned after the rental',
          'misfire unarmed',
          'misfire early',
          'misfire repeated',
        ]),
      );
    },
  );
});
