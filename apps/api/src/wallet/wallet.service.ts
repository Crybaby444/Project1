import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { cents, topUp, withdraw, type OperationKind } from '@yoyo/domain';
import { WALLET_LIMITS, type PayoutResponse, type TopUpResponse, type WalletSummary, type WalletTransactionsResponse } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import { LedgerService, walletAccount } from '../ledger/ledger.service';
import { MoneyOutService } from '../payments/money-out.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment.provider';
import { PrismaService } from '../prisma/prisma.service';

const overLimit = () => new AppError('WALLET_LIMIT', 409, `A wallet holds at most ${WALLET_LIMITS.balance} cents`);

/** The card token is not one the provider issued. */
export const unknownCard = () => new AppError('VALIDATION_FAILED', 400, undefined, { cardToken: 'Enter the card again' });

export const declined = (declineCode: string) => new AppError('PAYMENT_DECLINED', 402, undefined, undefined, { declineCode });

/** The user's wallet (spec §4.5): its balance from the ledger, its history, card top-ups and payouts. */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly moneyOut: MoneyOutService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async summary(userId: string): Promise<WalletSummary> {
    const [held] = await this.prisma.$queryRaw<{ total: bigint | null }[]>`
      SELECT SUM(a.balance) AS total
      FROM "Booking" b
      JOIN "LedgerAccount" a ON a.id IN ('escrow:' || b.id, 'deposit:' || b.id)
      WHERE b."renterId" = ${userId} AND b."paymentMethod" = 'WALLET'`;
    return { balanceCents: await this.ledger.balance(walletAccount(userId)), heldCents: Number(held?.total ?? 0) };
  }

  history(userId: string, page = 1, kind?: OperationKind): Promise<WalletTransactionsResponse> {
    return this.ledger.walletHistory(userId, { page, ...(kind && { kind }) });
  }

  /**
   * Takes `amountCents` from the card into the wallet. The card is charged first; if recording it then
   * fails, the charge is given back at once. Each attempt has its own provider key, so a retry never
   * reuses a charge that was given back; the client's Idempotency-Key keeps double clicks to one attempt.
   */
  async topUp(userId: string, amountCents: number, cardToken: string): Promise<TopUpResponse> {
    if ((await this.ledger.balance(walletAccount(userId))) + amountCents > WALLET_LIMITS.balance) throw overLimit();
    const charge = await this.provider.charge({
      token: cardToken,
      amountCents,
      idempotencyKey: `top-up:${userId}:${randomUUID()}`,
      description: 'Yoyo wallet top-up',
    });
    if (charge.status === 'DECLINED') throw charge.declineCode === 'invalid_token' ? unknownCard() : declined(charge.declineCode);
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const balances = await this.ledger.lock([walletAccount(userId)], tx);
        if ((balances.get(walletAccount(userId)) ?? 0) + amountCents > WALLET_LIMITS.balance) throw overLimit();
        await this.ledger.post(topUp(userId, cents(amountCents)), tx, { userId });
        return tx.payment.create({
          data: { userId, purpose: 'TOP_UP', amountCents, providerRef: charge.ref, brand: charge.brand, last4: charge.last4 },
        });
      });
      return {
        balanceCents: await this.ledger.balance(walletAccount(userId)),
        payment: { id: payment.id, amountCents, brand: payment.brand, last4: payment.last4 },
      };
    } catch (error) {
      await this.moneyOut.giveBack({ ref: charge.ref, amountCents, brand: charge.brand, last4: charge.last4 }, { userId, purpose: 'TOP_UP' });
      throw error;
    }
  }

  /**
   * Moves `amountCents` from the wallet to a card. The wallet is debited in the transaction that records
   * the payout (so the money cannot be spent twice); the provider pays out right after, or later by the
   * timers job if it is down.
   */
  async payout(userId: string, amountCents: number, cardToken: string): Promise<PayoutResponse> {
    const card = this.provider.describe(cardToken);
    if (card === null) throw unknownCard();
    const payout = await this.prisma.$transaction(async (tx) => {
      const operationId = await this.ledger.post(withdraw(userId, cents(amountCents)), tx, { userId });
      return tx.payout.create({ data: { userId, amountCents, brand: card.brand, last4: card.last4, destinationToken: cardToken, operationId } });
    });
    await this.moneyOut.processPayout(payout.id);
    const fresh = await this.prisma.payout.findUniqueOrThrow({ where: { id: payout.id } });
    return {
      balanceCents: await this.ledger.balance(walletAccount(userId)),
      payout: { id: fresh.id, amountCents, brand: fresh.brand, last4: fresh.last4, status: fresh.status },
    };
  }
}
