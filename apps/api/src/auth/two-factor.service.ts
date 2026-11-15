import { Inject, Injectable } from '@nestjs/common';
import type { TwoFactorSetup } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { newTotpSecret, openTotpSecret, sealTotpSecret, totpUri, verifyTotp } from './totp';

/**
 * Two-step sign-in (owner's admin checklist, 2026-11-15): after the password, a 6-digit code from an
 * authenticator app. Set up in two moves — get a secret, then prove the app has it with a code — so a
 * mistyped secret never locks anyone out. Each code works once (totpLastStep).
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'JWT_SECRET'>,
  ) {}

  enabled(user: Pick<User, 'totpEnabledAt'>): boolean {
    return user.totpEnabledAt !== null;
  }

  /** A fresh secret, kept but not yet on; replaces an unfinished one. Accounts without a password can't (Google-only). */
  async setup(user: User): Promise<TwoFactorSetup> {
    if (this.enabled(user)) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Two-step sign-in is already on', undefined, { why: 'ALREADY_ON' });
    if (user.passwordHash === null) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Set a password first', undefined, { why: 'NO_PASSWORD' });
    const secret = newTotpSecret();
    await this.prisma.user.update({ where: { id: user.id }, data: { totpSecret: sealTotpSecret(secret, this.env.JWT_SECRET), totpLastStep: null } });
    return { secret, uri: totpUri(secret, user.email) };
  }

  /** Turns it on once the app shows the right code for the secret from setup(). */
  async enable(user: User, code: string): Promise<void> {
    if (this.enabled(user)) return;
    if (!user.totpSecret) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Start the set-up first', undefined, { why: 'NO_SETUP' });
    await this.accept(user, code);
    await this.prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: this.clock.now() } });
  }

  /** Turns it off; needs a current code, so a stolen session alone can't. */
  async disable(user: User, code: string): Promise<void> {
    if (!this.enabled(user)) return;
    await this.accept(user, code);
    await this.clear(user.id);
  }

  /** The owner's reset for someone who lost their phone (audited by the caller). */
  async clear(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null } });
  }

  /** Sign-in's check: nothing to do when it's off; otherwise the code must be there and right. */
  async checkSignIn(user: User, code: string | undefined): Promise<void> {
    if (!this.enabled(user)) return;
    if (!code) throw new AppError('AUTH_CODE_REQUIRED', 401, 'Enter the code from your authenticator app');
    await this.accept(user, code);
  }

  /** The code is right and newer than the last accepted one; remembers its step. */
  private async accept(user: User, code: string): Promise<void> {
    const secret = user.totpSecret ? openTotpSecret(user.totpSecret, this.env.JWT_SECRET) : null;
    const step = secret ? verifyTotp(secret, code, Math.floor(this.clock.now().getTime() / 1000)) : null;
    if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) throw new AppError('AUTH_CODE_INVALID', 401, 'Wrong or used code');
    // Conditional write: two requests with the same code can't both pass.
    const won = await this.prisma.user.updateMany({
      where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    if (won.count === 0) throw new AppError('AUTH_CODE_INVALID', 401, 'Wrong or used code');
  }
}
