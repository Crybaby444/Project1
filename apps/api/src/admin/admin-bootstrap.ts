import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { maskEmail } from '../mail/mail.provider';
import { PrismaService } from '../prisma/prisma.service';
import { ensureAdmin } from './ensure-admin';

/**
 * Ensures the administrator account on every API start (production never runs the seed). A failure,
 * e.g. the database being down, is logged and never stops the API from starting.
 */
@Injectable()
export class AdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger('Admin');

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    @Inject(ENV) private readonly env: Pick<Env, 'ADMIN_EMAIL' | 'ADMIN_PASSWORD'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = this.env;
    if (!email && !password) return;
    if (!email || !password) {
      this.logger.warn('Set both ADMIN_EMAIL and ADMIN_PASSWORD to create the administrator account');
      return;
    }
    try {
      await ensureAdmin(this.prisma, this.passwords, this.env, this.clock.now(), this.logger);
      this.logger.log(`administrator account ready: ${maskEmail(email)}`);
    } catch (error) {
      this.logger.error(`could not ensure the administrator account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
