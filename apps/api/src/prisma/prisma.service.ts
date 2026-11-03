import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV, type Env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

/** How long a health probe may take before the database counts as down. */
const HEALTH_TIMEOUT_MS = 3000;
const DEFAULT_CONNECT_TIMEOUT_MS = 5000;

type PrismaEnv = Pick<Env, 'DATABASE_URL'> & Partial<Pick<Env, 'DB_CONNECT_TIMEOUT_MS'>>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: PrismaEnv) {
    // Prisma connects lazily on the first query, so the API still boots when the database is down.
    // The connect timeout stops requests from hanging forever when the host does not answer at all.
    super({
      adapter: new PrismaPg({
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT_MS ?? DEFAULT_CONNECT_TIMEOUT_MS,
      }),
    });
  }

  /**
   * Runs `SELECT 1` and answers within `timeoutMs`. Never throws, so callers can report degraded
   * health instead of crashing or hanging.
   */
  async isHealthy(timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const tooSlow = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const probe = this.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    try {
      return await Promise.race([probe, tooSlow]);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
