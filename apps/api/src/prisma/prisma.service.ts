import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV, type Env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Pick<Env, 'DATABASE_URL'>) {
    // Prisma connects lazily on the first query, so the API still boots when the database is down.
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  /** Runs `SELECT 1`; never throws, so callers can report degraded health instead of crashing. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
