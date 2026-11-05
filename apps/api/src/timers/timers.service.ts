import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { TimerKind } from '@yoyo/domain';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { BookingsService } from '../bookings/bookings.service';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { OffersService } from '../offers/offers.service';
import { MoneyOutService } from '../payments/money-out.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 3_600_000;

export interface TimersRun {
  /** Deals whose deadline fired. */
  fired: number;
  /** Deals that could not be handled (logged); the next run tries them again. */
  failed: number;
  offersExpired: number;
  /** Refunds and payouts sent (or retried). */
  moneyJobs: number;
  keysForgotten: number;
  /** Stopped at the limit or the time budget with deadlines still due. */
  more: boolean;
}

/**
 * Fires due deadlines of deals (plan 8, Task 10). Render's free server sleeps, so nothing waits in
 * memory: the deadline is in the row (`timerDueAt`), and this runs at every start and whenever the
 * scheduled GitHub workflow calls POST /internal/timers/run. Safe to run late, twice or at once: rows are
 * taken one by one with FOR UPDATE SKIP LOCKED, and the domain ignores a TIMEOUT that is not armed or due.
 */
@Injectable()
export class TimersService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Timers');

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly rules: BookingRulesService,
    private readonly offers: OffersService,
    private readonly moneyOut: MoneyOutService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'NODE_ENV'>,
  ) {}

  /** At start, in the background: a server that slept catches up without delaying its first answer. */
  onApplicationBootstrap(): void {
    if (this.env.NODE_ENV === 'test') return;
    void this.runDue()
      .then((run) => this.logger.log(`start-up run: ${JSON.stringify(run)}`))
      .catch((error: unknown) => this.logger.error(`start-up run failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  async runDue({ limit = 200, budgetMs = 20_000 }: { limit?: number; budgetMs?: number } = {}): Promise<TimersRun> {
    const startedAt = performance.now();
    const skip: string[] = [];
    let fired = 0;
    let failed = 0;
    let more = false;
    for (;;) {
      if (fired + failed >= limit || performance.now() - startedAt > budgetMs) {
        more = true;
        break;
      }
      let current: string | undefined;
      try {
        const result = await this.fireNext(skip, (id) => (current = id));
        if (result === null) break;
        if (result.changed) fired++;
        else skip.push(result.id);
      } catch (error) {
        failed++;
        if (current !== undefined) skip.push(current);
        this.logger.error(`deadline of booking ${current ?? '?'} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
        if (current === undefined) break;
      }
    }
    const offersExpired = await this.offers.expireDue();
    const moneyJobs = await this.moneyOut.processPending();
    const { count: keysForgotten } = await this.prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: new Date(this.clock.now().getTime() - DAY) } },
    });
    return { fired, failed, offersExpired, moneyJobs, keysForgotten, more };
  }

  /** Fires the deadline of the most overdue deal nobody else is handling; null when none is due. */
  private async fireNext(skip: readonly string[], taking: (id: string) => void): Promise<{ id: string; changed: boolean } | null> {
    const now = this.clock.now();
    const settings = await this.rules.settings();
    const outcome = await this.prisma.$transaction(async (tx) => {
      const [due] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Booking"
        WHERE "timerDueAt" <= ${now} AND NOT (id = ANY(${[...skip]}::text[]))
        ORDER BY "timerDueAt", id
        LIMIT 1
        FOR UPDATE SKIP LOCKED`;
      if (!due) return null;
      taking(due.id);
      const row = await this.bookings.lockedRow(tx, due.id);
      const timer = row.timerKind as TimerKind;
      const saved = await this.bookings.decideAndSave(tx, row, { kind: 'SYSTEM' }, { type: 'TIMEOUT', timer }, { now, settings });
      return { id: due.id, changed: saved.changed, after: saved.after };
    });
    if (outcome === null) return null;
    await this.bookings.afterCommit(outcome.after);
    return { id: outcome.id, changed: outcome.changed };
  }
}
