import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { ErrorLogService } from '../common/error-log.service';
import { ActivityService } from '../activity/activity.service';
import type { TimerKind } from '@yoyo/domain';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { BookingsService } from '../bookings/bookings.service';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { OffersService } from '../offers/offers.service';
import { MoneyOutService } from '../payments/money-out.service';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from './reminders.service';

const DAY = 24 * 3_600_000;

/** How often an awake server runs the due work on its own (the GitHub schedule wakes a sleeping one). */
export const AWAKE_EVERY_MS = 10 * 60_000;

export interface TimersRun {
  /** Deals whose deadline fired. */
  fired: number;
  /** Deals that could not be handled (logged); the next run tries them again. */
  failed: number;
  offersExpired: number;
  /** Refunds and payouts sent (or retried). */
  moneyJobs: number;
  keysForgotten: number;
  /** Deals whose people were reminded: tomorrow's handover or return, a request or booking about to expire, a review. */
  reminders: number;
  /** Stopped at the limit or the time budget with deadlines still due. */
  more: boolean;
}

/**
 * Fires due deadlines of deals (plan 8, Task 10), then sends the day-before reminders (RemindersService). Render's free server sleeps, so nothing waits in
 * memory: the deadline is in the row (`timerDueAt`), and this runs at every start and whenever the
 * scheduled GitHub workflow calls POST /internal/timers/run. Safe to run late, twice or at once: rows are
 * taken one by one with FOR UPDATE SKIP LOCKED, and the domain ignores a TIMEOUT that is not armed or due.
 */
@Injectable()
export class TimersService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Timers');
  private ticking = false;
  private every: NodeJS.Timeout | undefined;

  constructor(
    private readonly errorLog: ErrorLogService,
    private readonly activity: ActivityService,
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly rules: BookingRulesService,
    private readonly offers: OffersService,
    private readonly moneyOut: MoneyOutService,
    private readonly reminders: RemindersService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'NODE_ENV'>,
  ) {}

  /**
   * At start, in the background: a server that slept catches up without delaying its first answer. Then,
   * while it is awake (people are using the site), every 10 minutes on its own: GitHub's schedule is a best
   * effort and came 6 to 10 hours apart (2026-11-26), late for deadlines and for the reminders. The
   * workflow stays, to wake a server that sleeps. Runs never overlap here, and SKIP LOCKED keeps them safe
   * across instances and alongside the workflow's call.
   */
  onApplicationBootstrap(): void {
    if (this.env.NODE_ENV === 'test') return;
    void this.tick('start-up');
    this.every = setInterval(() => void this.tick('scheduled'), AWAKE_EVERY_MS);
    this.every.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.every);
  }

  /** One run in the background, logged at start-up and whenever it did something. */
  async tick(kind: 'start-up' | 'scheduled'): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const run = await this.runDue();
      const did = run.fired + run.failed + run.offersExpired + run.moneyJobs + run.reminders > 0;
      if (kind === 'start-up' || did) this.logger.log(`${kind} run: ${JSON.stringify(run)}`);
    } catch (error) {
      this.logger.error(`${kind} run failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.ticking = false;
    }
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
    // A reminder that fails must not hold up refunds and payouts (above) or the clean-up (below).
    const reminders = await this.reminders.sendDue().catch((error: unknown) => {
      this.logger.error(`reminders failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
      return 0;
    });
    const { count: keysForgotten } = await this.prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: new Date(this.clock.now().getTime() - DAY) } },
    });
    // Server errors older than 30 days go.
    await this.errorLog.prune();
    // Activity older than 180 days goes (GDPR: kept no longer than the admin needs it).
    await this.activity.prune();
    return { fired, failed, offersExpired, moneyJobs, keysForgotten, reminders, more };
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
