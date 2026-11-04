import { DomainError } from './errors';
import { cents } from './money';
import type { Cents } from './money';
import type { Quote } from './pricing';

/**
 * Accounts of the double-entry journal (spec §4.5). A balance is the sum of the account's postings.
 * - `wallet:<userId>` — what a user can spend or withdraw;
 * - `escrow:<bookingId>` — rent Yoyo holds until the handover is confirmed;
 * - `deposit:<bookingId>` — the frozen deposit;
 * - `platform:revenue` — Yoyo's service fees;
 * - `external:card` — the world outside Yoyo (the simulated card); below zero means money came in.
 */
export type AccountId =
  `wallet:${string}` | `escrow:${string}` | `deposit:${string}` | 'platform:revenue' | 'external:card';

/** One line of an operation: a whole, non-zero number of cents into (+) or out of (−) an account. */
export interface Posting {
  readonly account: AccountId;
  readonly amount: number;
}

export type OperationKind =
  | 'TOP_UP'
  | 'WITHDRAWAL'
  | 'BOOKING_PAYMENT'
  | 'RENT_RELEASE'
  | 'DEPOSIT_REFUND'
  | 'DEPOSIT_TO_OWNER'
  | 'BOOKING_REFUND';

/** A journal entry: its postings always sum to zero, so money is moved, never created or lost. */
export interface LedgerOperation {
  readonly kind: OperationKind;
  readonly postings: readonly Posting[];
  readonly bookingId?: string;
}

/** How the renter paid. Money always goes back the same way (spec §0). */
export type PaymentMethod = 'WALLET' | 'CARD';

function id(value: string, field: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new DomainError('INVALID_INPUT', { field, value: String(value) });
  }
  return value;
}

/** The renter's wallet or the outside world, depending on how they paid. */
function payerAccount(method: PaymentMethod, renterId: string): AccountId {
  if (method === 'WALLET') return `wallet:${id(renterId, 'renterId')}`;
  if (method === 'CARD') return 'external:card';
  throw new DomainError('INVALID_INPUT', { field: 'method', value: String(method) });
}

/** Builds an operation, leaving out zero amounts, and checks that it balances. */
function operation(
  kind: OperationKind,
  lines: ReadonlyArray<readonly [AccountId, number]>,
  bookingId?: string,
): LedgerOperation {
  const postings = lines
    .filter(([, amount]) => amount !== 0)
    .map(([account, amount]) => ({ account, amount }));
  const op: LedgerOperation = bookingId === undefined ? { kind, postings } : { kind, postings, bookingId };
  assertBalanced(op);
  return op;
}

function orNull(op: LedgerOperation): LedgerOperation | null {
  return op.postings.length === 0 ? null : op;
}

function positive(amount: Cents): Cents {
  if (cents(amount) === 0) throw new DomainError('INVALID_AMOUNT', { value: amount });
  return amount;
}

/** Money comes in from the card to the user's wallet. */
export function topUp(userId: string, amount: Cents): LedgerOperation {
  const value = positive(amount);
  return operation('TOP_UP', [
    ['external:card', -value],
    [`wallet:${id(userId, 'userId')}`, value],
  ]);
}

/** Money goes out of the user's wallet to their card. */
export function withdraw(userId: string, amount: Cents): LedgerOperation {
  const value = positive(amount);
  return operation('WITHDRAWAL', [
    [`wallet:${id(userId, 'userId')}`, -value],
    ['external:card', value],
  ]);
}

interface BookingMoney {
  readonly bookingId: string;
  readonly renterId: string;
  readonly quote: Quote;
  readonly method: PaymentMethod;
}

/** The renter pays the total: the rent is held in escrow, the deposit is frozen, the fee goes to Yoyo. */
export function bookingPayment({ bookingId, renterId, quote, method }: BookingMoney): LedgerOperation {
  const booking = id(bookingId, 'bookingId');
  return operation(
    'BOOKING_PAYMENT',
    [
      [payerAccount(method, renterId), -positive(quote.totalCents)],
      [`escrow:${booking}`, cents(quote.rentCents)],
      [`deposit:${booking}`, cents(quote.depositCents)],
      ['platform:revenue', cents(quote.serviceFeeCents)],
    ],
    booking,
  );
}

/** Everything paid goes back the way it came; Yoyo gives its fee back too. */
export function bookingRefund({ bookingId, renterId, quote, method }: BookingMoney): LedgerOperation {
  const booking = id(bookingId, 'bookingId');
  return operation(
    'BOOKING_REFUND',
    [
      [`escrow:${booking}`, -cents(quote.rentCents)],
      [`deposit:${booking}`, -cents(quote.depositCents)],
      ['platform:revenue', -cents(quote.serviceFeeCents)],
      [payerAccount(method, renterId), positive(quote.totalCents)],
    ],
    booking,
  );
}

/** The handover is confirmed: the rent leaves escrow for the owner's wallet. `null` when there is no rent. */
export function rentRelease(input: {
  readonly bookingId: string;
  readonly ownerId: string;
  readonly rentCents: Cents;
}): LedgerOperation | null {
  const booking = id(input.bookingId, 'bookingId');
  const rent = cents(input.rentCents);
  return orNull(
    operation(
      'RENT_RELEASE',
      [
        [`escrow:${booking}`, -rent],
        [`wallet:${id(input.ownerId, 'ownerId')}`, rent],
      ],
      booking,
    ),
  );
}

/** The deposit goes back to the renter the way they paid. `null` when there is no deposit. */
export function depositRefund(input: {
  readonly bookingId: string;
  readonly renterId: string;
  readonly depositCents: Cents;
  readonly method: PaymentMethod;
}): LedgerOperation | null {
  const booking = id(input.bookingId, 'bookingId');
  const deposit = cents(input.depositCents);
  return orNull(
    operation(
      'DEPOSIT_REFUND',
      [
        [`deposit:${booking}`, -deposit],
        [payerAccount(input.method, input.renterId), deposit],
      ],
      booking,
    ),
  );
}

/** The deposit goes to the owner's wallet. `null` when there is no deposit. */
export function depositToOwner(input: {
  readonly bookingId: string;
  readonly ownerId: string;
  readonly depositCents: Cents;
}): LedgerOperation | null {
  const booking = id(input.bookingId, 'bookingId');
  const deposit = cents(input.depositCents);
  return orNull(
    operation(
      'DEPOSIT_TO_OWNER',
      [
        [`deposit:${booking}`, -deposit],
        [`wallet:${id(input.ownerId, 'ownerId')}`, deposit],
      ],
      booking,
    ),
  );
}

/** Throws `UNBALANCED_OPERATION` unless every posting is a whole, non-zero amount and they sum to zero. */
export function assertBalanced(op: LedgerOperation): void {
  let sum = 0;
  for (const { account, amount } of op.postings) {
    if (!Number.isSafeInteger(amount) || amount === 0) {
      throw new DomainError('UNBALANCED_OPERATION', { kind: op.kind, account, amount });
    }
    sum += amount;
  }
  if (sum !== 0) {
    throw new DomainError('UNBALANCED_OPERATION', { kind: op.kind, sum });
  }
}

/**
 * Applies an operation to balances and returns the new balances; the input is not changed.
 * A wallet may not go below zero (`INSUFFICIENT_FUNDS`), nor may escrow or a deposit
 * (`NEGATIVE_BALANCE`). The card and Yoyo's revenue have no such limit.
 */
export function applyOperation(
  balances: ReadonlyMap<AccountId, number>,
  op: LedgerOperation,
): Map<AccountId, number> {
  assertBalanced(op);
  const next = new Map(balances);
  for (const { account, amount } of op.postings) {
    next.set(account, (next.get(account) ?? 0) + amount);
  }
  for (const { account } of op.postings) {
    const balance = next.get(account) ?? 0;
    if (balance >= 0) continue;
    if (account.startsWith('wallet:')) {
      throw new DomainError('INSUFFICIENT_FUNDS', {
        account,
        availableCents: balances.get(account) ?? 0,
        shortfallCents: -balance,
      });
    }
    if (account.startsWith('escrow:') || account.startsWith('deposit:')) {
      throw new DomainError('NEGATIVE_BALANCE', { account, balance });
    }
  }
  return next;
}
