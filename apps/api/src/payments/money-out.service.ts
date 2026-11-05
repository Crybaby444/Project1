import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider';

/** After this many failed attempts a refund or payout is FAILED and needs an administrator. */
export const MONEY_JOB_MAX_ATTEMPTS = 10;

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

/**
 * Sends money out of Yoyo after the ledger already recorded it: refunds to cards and payouts. Each job
 * is a row written in the same transaction as its ledger operation, so nothing is lost if the process
 * dies; this sends it, at most one sender at a time (row lock), with the job's id as the provider's
 * idempotency key, so a retry never pays twice. TimersService retries what is left PENDING.
 */
@Injectable()
export class MoneyOutService {
  private readonly logger = new Logger('MoneyOut');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Gives back a card charge that nothing in Yoyo took (the deal changed meanwhile, the top-up could not
   * be recorded). The charge is written down first, fully refunded, with its refund job, and then sent:
   * if the provider fails, the job stays PENDING and the timers job retries it, so the money is never
   * lost, and the caller still answers with its own error. Never throws for the provider's failure.
   */
  async giveBack(
    charge: { ref: string; amountCents: number; brand: string; last4: string },
    owner: { userId: string; bookingId?: string; purpose: 'BOOKING' | 'TOP_UP' },
  ): Promise<void> {
    const payment = await this.prisma.payment.create({
      data: {
        userId: owner.userId,
        bookingId: owner.bookingId ?? null,
        purpose: owner.purpose,
        amountCents: charge.amountCents,
        refundedCents: charge.amountCents,
        providerRef: charge.ref,
        brand: charge.brand,
        last4: charge.last4,
        refunds: { create: { amountCents: charge.amountCents, createdAt: this.clock.now() } },
      },
      include: { refunds: true },
    });
    await this.processRefund(payment.refunds[0]!.id);
  }

  /** Sends every PENDING job (oldest first, at most `limit`); returns how many were tried. */
  async processPending(limit = 50): Promise<number> {
    const [refunds, payouts] = await Promise.all([
      this.prisma.paymentRefund.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: limit, select: { id: true } }),
      this.prisma.payout.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: limit, select: { id: true } }),
    ]);
    for (const { id } of refunds) await this.processRefund(id);
    for (const { id } of payouts) await this.processPayout(id);
    return refunds.length + payouts.length;
  }

  async processRefund(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const [row] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "PaymentRefund" WHERE id = ${id} AND status = 'PENDING' FOR UPDATE SKIP LOCKED`;
        if (!row) return;
        const refund = await tx.paymentRefund.findUniqueOrThrow({ where: { id }, include: { payment: true } });
        const { ref } = await this.provider.refund({ paymentRef: refund.payment.providerRef, amountCents: refund.amountCents, idempotencyKey: id });
        await tx.paymentRefund.update({
          where: { id },
          data: { status: 'DONE', providerRef: ref, attempts: { increment: 1 }, doneAt: this.clock.now(), lastError: null },
        });
      });
    } catch (error) {
      await this.failed('refund', id, error);
    }
  }

  async processPayout(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const [row] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Payout" WHERE id = ${id} AND status = 'PENDING' FOR UPDATE SKIP LOCKED`;
        if (!row) return;
        const payout = await tx.payout.findUniqueOrThrow({ where: { id } });
        const { ref } = await this.provider.payout({ token: payout.destinationToken, amountCents: payout.amountCents, idempotencyKey: id });
        await tx.payout.update({
          where: { id },
          data: { status: 'DONE', providerRef: ref, attempts: { increment: 1 }, doneAt: this.clock.now(), lastError: null },
        });
      });
    } catch (error) {
      await this.failed('payout', id, error);
    }
  }

  private async failed(kind: 'refund' | 'payout', id: string, error: unknown): Promise<void> {
    const lastError = reason(error);
    const data = { attempts: { increment: 1 }, lastError };
    const job =
      kind === 'refund'
        ? await this.prisma.paymentRefund.update({ where: { id }, data })
        : await this.prisma.payout.update({ where: { id }, data });
    if (job.attempts >= MONEY_JOB_MAX_ATTEMPTS) {
      if (kind === 'refund') await this.prisma.paymentRefund.update({ where: { id }, data: { status: 'FAILED' } });
      else await this.prisma.payout.update({ where: { id }, data: { status: 'FAILED' } });
      this.logger.error(`${kind} ${id} FAILED after ${job.attempts} attempts, an administrator must look at it: ${lastError}`);
    } else {
      this.logger.warn(`${kind} ${id} attempt ${job.attempts} failed, will retry: ${lastError}`);
    }
  }
}
