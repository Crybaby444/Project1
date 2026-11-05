import { addDays, DomainError, localDateIn } from '@yoyo/domain';
import type { BookingAction, BookingEventInput, PublicUser } from '@yoyo/shared';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { toPublicUser } from '../src/auth/public-user';
import type { Listing } from '../src/generated/prisma/client';
import { BookingsService } from '../src/bookings/bookings.service';
import { AppError } from '../src/common/app-error';
import { LedgerService } from '../src/ledger/ledger.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../src/payments/payment.provider';
import { TimersService } from '../src/timers/timers.service';
import { WalletService } from '../src/wallet/wallet.service';
import { resetAccounts, resetDeals } from './support/db';
import { resetListings, seedListing } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const RUNS = Number(process.env['FC_RUNS'] ?? 40);
/** Fixed by default so CI explores the same paths (and the coverage check below is stable); FC_SEED=… explores others. */
const SEED = Number(process.env['FC_SEED'] ?? 20_261_105);
const HOUR = 3_600_000;

let t: TestApp;
let bookings: BookingsService;
let ledger: LedgerService;
let wallet: WalletService;
let timers: TimersService;
let cards: PaymentProvider;

beforeAll(async () => {
  t = await createTestApp();
  bookings = t.app.get(BookingsService);
  ledger = t.app.get(LedgerService);
  wallet = t.app.get(WalletService);
  timers = t.app.get(TimersService);
  cards = t.app.get(PAYMENT_PROVIDER);
});

afterAll(async () => {
  await t.close();
});

/** Refusals a user can meet on the way; anything else (a 500, a broken invariant) fails the property. */
const EXPECTED_DOMAIN = new Set(['TRANSITION_NOT_ALLOWED', 'INSUFFICIENT_FUNDS', 'DATES_UNAVAILABLE', 'START_IN_PAST', 'TOO_FAR_AHEAD', 'PERIOD_TOO_SHORT', 'PERIOD_TOO_LONG', 'CONTRACT_NOT_SIGNED', 'NOT_A_PARTY', 'CANNOT_RENT_OWN']);

async function expectedRefusal(run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof AppError && error.status < 500) return;
    if (error instanceof DomainError && EXPECTED_DOMAIN.has(error.code)) return;
    throw error;
  }
}

/** How a deal would like to end; it takes that turn when the rules offer it, and moves forward otherwise. */
const INTENTS = {
  fine: [],
  damageAccepted: ['RETURNED:OWNER:REPORT_DAMAGE', 'DAMAGE_CLAIMED:RENTER:ACCEPT_DAMAGE'],
  damageDisputed: ['RETURNED:OWNER:REPORT_DAMAGE', 'DAMAGE_CLAIMED:RENTER:REJECT_DAMAGE'],
  ownerCancelsPaid: ['PAID:OWNER:CANCEL'],
  renterCancelsPaid: ['PAID:RENTER:CANCEL'],
  declined: ['REQUESTED:OWNER:DECLINE'],
  withdrawn: ['REQUESTED:RENTER:WITHDRAW'],
  cancelledUnpaid: ['ACCEPTED:RENTER:CANCEL'],
  notReceived: ['PAID:RENTER:REPORT_NOT_RECEIVED'],
  notReturned: ['ACTIVE:OWNER:REPORT_NOT_RETURNED'],
  /** The owner never inspects: the 48-hour INSPECTION deadline decides. */
  ownerSilent: ['RETURNED:WAIT'],
} as const satisfies Record<string, readonly string[]>;

type Intent = keyof typeof INTENTS;

/** Turns that end or derail a deal: taken only when the intent (or noise) asks for them. */
const DERAILING: ReadonlySet<BookingAction> = new Set(['DECLINE', 'CANCEL', 'WITHDRAW', 'REPORT_NOT_RECEIVED', 'REPORT_NOT_RETURNED', 'REPORT_DAMAGE', 'REJECT_DAMAGE']);

/** The forward order of the table: accept, sign, pay, hand over, receive, return, inspect. */
const FORWARD: readonly BookingAction[] = [
  'ACCEPT',
  'SIGN',
  'PAY',
  'MARK_HANDED_OVER',
  'CONFIRM_RECEIVED',
  'MARK_RETURNED',
  'CONFIRM_RETURNED',
  'ALL_FINE',
  'ACCEPT_DAMAGE',
];

const ROUNDS = 16;

const dealArb = fc.record({
  renter: fc.nat(1),
  listing: fc.nat(2),
  offset: fc.nat(1),
  days: fc.integer({ min: 1, max: 4 }),
  intent: fc.constantFrom(...(Object.keys(INTENTS) as Intent[])),
  card: fc.boolean(),
  decision: fc.nat(1),
  /** Hours to wait before each round (0 mostly): deadlines fire at random steps. */
  waits: fc.array(fc.oneof({ weight: 4, arbitrary: fc.constant(0) }, { weight: 1, arbitrary: fc.integer({ min: 1, max: 60 }) }), { minLength: ROUNDS, maxLength: ROUNDS }),
  /** 0 in a round: take a random turn instead of the planned one. */
  noise: fc.array(fc.nat(9), { minLength: ROUNDS, maxLength: ROUNDS }),
});

const moneyArb = fc.record({
  kind: fc.constantFrom('topUp' as const, 'payout' as const),
  user: fc.nat(3),
  amount: fc.integer({ min: 100, max: 30_000 }),
});

function eventFor(action: BookingAction, card: boolean): BookingEventInput | null {
  switch (action) {
    case 'DECLINE':
    case 'CANCEL':
      return { type: action, reason: 'Changed my plans' };
    case 'REPORT_NOT_RECEIVED':
    case 'REPORT_NOT_RETURNED':
    case 'REJECT_DAMAGE':
      return { type: action, note: 'That is not what happened' };
    case 'PAY':
      return card ? { type: 'PAY', method: 'CARD', cardToken: token('4242424242424242') } : { type: 'PAY', method: 'WALLET' };
    case 'REPORT_DAMAGE':
    case 'RESOLVE':
      return null;
    default:
      return { type: action } as BookingEventInput;
  }
}

const token = (number: string) => cards.tokenize({ number, expMonth: 12, expYear: 2040, cvc: '123', holder: 'Prop Test' }).token;

async function checkBooks(): Promise<void> {
  expect(await ledger.audit()).toEqual({ sumOfAll: 0, mismatched: [], unbalancedOperations: [], negative: [] });
}

describe('money in persisted deals (property)', () => {
  it(`is conserved across ${RUNS} random runs of deals, wallets and deadlines`, async () => {
    const reached = new Set<string>();
    await fc.assert(
      fc.asyncProperty(fc.array(dealArb, { minLength: 1, maxLength: 3 }), fc.array(moneyArb, { maxLength: ROUNDS }), async (deals, moves) => {
        await resetDeals(t.prisma);
        await resetListings(t);
        await resetAccounts(t.prisma);
        // Users 0 and 1 own the listings, 2 and 3 rent; everybody starts with 300 € in the wallet.
        const users: PublicUser[] = [];
        for (let i = 0; i < 4; i++) users.push(toPublicUser((await seedUser(t, { emailVerified: true })).user));
        const admin = toPublicUser((await seedUser(t, { role: 'ADMIN', emailVerified: true })).user);
        const listings: Listing[] = [];
        for (let i = 0; i < 3; i++) {
          listings.push(await seedListing(t, users[i % 2]!, { status: 'PUBLISHED', dailyCents: 1000 + 700 * i, depositCents: 2500 * i, weeklyDiscountPercent: 10 }));
        }
        for (const user of users) await wallet.topUp(user.id, 30_000, token('4242424242424242'));

        const ids: (string | null)[] = [];
        for (const d of deals) {
          const today = localDateIn(t.clock.now(), 'Europe/Riga');
          let id: string | null = null;
          await expectedRefusal(async () => {
            id = (await bookings.create(users[2 + d.renter]!, { listingId: listings[d.listing]!.id, start: addDays(today, d.offset), end: addDays(today, d.offset + d.days - 1) })).id;
          });
          ids.push(id);
          await checkBooks();
        }

        for (let round = 0; round < ROUNDS; round++) {
          for (const [i, d] of deals.entries()) {
            const id = ids[i];
            if (!id) continue;
            if (d.waits[round]! > 0) {
              t.clock.advance(d.waits[round]! * HOUR);
              await timers.runDue();
              await checkBooks();
            }
            const row = await t.prisma.booking.findUniqueOrThrow({ where: { id } });
            if (row.status === 'DISPUTED') {
              const decisions = row.disputeReason === 'NOT_HANDED_OVER' ? (['REFUND_ALL', 'CONFIRM_HANDOVER'] as const) : (['REFUND_DEPOSIT', 'DEPOSIT_TO_OWNER'] as const);
              await expectedRefusal(() => bookings.resolve(id, admin, row.version, decisions[d.decision]!, 'Decided by the property test'));
              await checkBooks();
              continue;
            }
            if ((INTENTS[d.intent] as readonly string[]).includes(`${row.status}:WAIT`)) {
              t.clock.advance(49 * HOUR);
              await timers.runDue();
              await checkBooks();
              continue;
            }
            const choices: { user: PublicUser; role: 'RENTER' | 'OWNER'; action: BookingAction; version: number }[] = [];
            for (const [partyId, role] of [[row.renterId, 'RENTER'], [row.ownerId, 'OWNER']] as const) {
              const party = users.find((u) => u.id === partyId)!;
              const view = await bookings.view(id, party);
              for (const action of view.actions) choices.push({ user: party, role, action, version: view.version });
            }
            if (choices.length === 0) continue;
            const wanted: readonly string[] = INTENTS[d.intent];
            const pick =
              d.noise[round] === 0
                ? choices[(round + i) % choices.length]
                : (choices.find((c) => wanted.includes(`${row.status}:${c.role}:${c.action}`)) ??
                  choices.filter((c) => !DERAILING.has(c.action)).sort((a, b) => FORWARD.indexOf(a.action) - FORWARD.indexOf(b.action))[0]);
            if (!pick) continue;
            if (pick.action === 'REPORT_DAMAGE') {
              const photo = await t.prisma.bookingPhoto.create({
                data: { bookingId: id, uploaderId: pick.user.id, kind: 'DAMAGE', storageKey: crypto.randomUUID(), width: 1, height: 1, bytes: 1, format: 'webp' },
              });
              await expectedRefusal(() => bookings.act(id, pick.user, pick.version, { type: 'REPORT_DAMAGE', description: 'Scratches all over it', photoIds: [photo.id] }));
            } else {
              const event = eventFor(pick.action, d.card);
              if (event) await expectedRefusal(() => bookings.act(id, pick.user, pick.version, event));
            }
            await checkBooks();
          }
          const move = moves[round];
          if (move) {
            const user = users[move.user]!;
            await expectedRefusal(() =>
              move.kind === 'topUp' ? wallet.topUp(user.id, move.amount, token('4242424242424242')) : wallet.payout(user.id, move.amount, token('5555555555554444')),
            );
            await checkBooks();
          }
        }
        // Closed deals hold nothing; reservations never overlap; Yoyo kept the fee of every paid, unrefunded deal.
        const all = await t.prisma.booking.findMany();
        for (const b of all) reached.add(b.outcome ? `${b.status}/${b.outcome}${b.paymentMethod ? `/${b.paymentMethod}` : ''}` : b.status);
        for (const e of await t.prisma.bookingEvent.findMany({ where: { type: { in: ['TIMEOUT', 'RESOLVE'] } } })) {
          const data = e.data as { timer?: string; decision?: string };
          reached.add(`${e.type}/${data.timer ?? data.decision ?? ''}`);
        }
        for (const b of all.filter((row) => ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(row.status))) {
          expect({ id: b.id, escrow: await ledger.balance(`escrow:${b.id}`), deposit: await ledger.balance(`deposit:${b.id}`) }).toEqual({ id: b.id, escrow: 0, deposit: 0 });
        }
        const [overlap] = await t.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) AS count FROM "Booking" a JOIN "Booking" b
            ON a."listingId" = b."listingId" AND a.id < b.id AND a.reserved && b.reserved`;
        expect(Number(overlap?.count)).toBe(0);
        const keptFees = all.filter((b) => b.paymentMethod !== null && b.outcome !== 'REFUNDED_ALL').reduce((sum, b) => sum + b.serviceFeeCents, 0);
        expect(await ledger.balance('platform:revenue')).toBe(keptFees);
        // Every card refund was sent.
        expect(await t.prisma.paymentRefund.count({ where: { status: { not: 'DONE' } } })).toBe(0);
      }),
      { numRuns: RUNS, seed: SEED, interruptAfterTimeLimit: 4 * 60_000 },
    );
    // The random paths reached every ending, by card and from the wallet, and the deadlines fired.
    expect([...reached].sort()).toEqual(
      expect.arrayContaining([
        'COMPLETED/DEPOSIT_REFUNDED/CARD',
        'COMPLETED/DEPOSIT_REFUNDED/WALLET',
        'COMPLETED/DEPOSIT_TO_OWNER/CARD',
        'COMPLETED/DEPOSIT_TO_OWNER/WALLET',
        'CANCELLED/REFUNDED_ALL/CARD',
        'CANCELLED/REFUNDED_ALL/WALLET',
        'RESOLVE/REFUND_ALL',
        'RESOLVE/CONFIRM_HANDOVER',
        'RESOLVE/REFUND_DEPOSIT',
        'RESOLVE/DEPOSIT_TO_OWNER',
        'EXPIRED',
        'DECLINED',
        'TIMEOUT/REQUEST_EXPIRY',
        'TIMEOUT/PAYMENT_EXPIRY',
        'TIMEOUT/INSPECTION',
      ]),
    );
  }, 5 * 60_000);
});
