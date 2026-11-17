import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import type { ServerErrorList } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';

const SAME_WINDOW_MS = 60_000;
const KEEP_DAYS = 30;

/**
 * Unexpected server errors kept for the admin (audit 2026-11-16: a crash was visible only in Render's
 * logs). The same message on the same route within a minute adds to one row. Never throws.
 */
@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger('ErrorLog');
  /** One record at a time, so a burst of the same error adds to one row instead of racing. */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  record(error: unknown, method: string, url: string): Promise<void> {
    this.queue = this.queue.then(() => this.write(error, method, url));
    return this.queue;
  }

  private async write(error: unknown, method: string, url: string): Promise<void> {
    try {
      const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 400);
      const stack = (error instanceof Error ? (error.stack ?? '') : '').slice(0, 4000);
      const path = url.split('?')[0]!.slice(0, 300);
      const now = this.clock.now();
      const same = await this.prisma.serverError.findFirst({
        where: { message, path, method, lastAt: { gte: new Date(now.getTime() - SAME_WINDOW_MS) } },
        orderBy: { lastAt: 'desc' },
      });
      if (same) await this.prisma.serverError.update({ where: { id: same.id }, data: { count: { increment: 1 }, lastAt: now } });
      else await this.prisma.serverError.create({ data: { message, stack, path, method, firstAt: now, lastAt: now } });
    } catch (failure) {
      this.logger.error(`Could not keep a server error: ${failure instanceof Error ? failure.message : String(failure)}`);
    }
  }

  async recent(): Promise<ServerErrorList> {
    const rows = await this.prisma.serverError.findMany({ orderBy: { lastAt: 'desc' }, take: 100 });
    return { items: rows.map((r) => ({ ...r, firstAt: r.firstAt.toISOString(), lastAt: r.lastAt.toISOString() })) };
  }

  async prune(): Promise<void> {
    await this.prisma.serverError.deleteMany({ where: { lastAt: { lt: new Date(this.clock.now().getTime() - KEEP_DAYS * 86_400_000) } } });
  }
}

/** Global, so the error filter (built outside the module tree) and the admin reach the same service. */
@Global()
@Module({ providers: [ErrorLogService], exports: [ErrorLogService] })
export class ErrorLogModule {}
