import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms.provider';

const MINUTE = 60_000;
/** A phone code works for 10 minutes. */
export const PHONE_CODE_TTL_MS = 10 * MINUTE;
/** After this many wrong codes the code is dead. */
export const PHONE_CODE_MAX_ATTEMPTS = 5;

const expired = () => new AppError('TOKEN_EXPIRED', 410, 'This code is no longer valid; ask for a new one');

/** Confirms a phone number with a 6-digit code sent by the SMS provider. */
@Injectable()
export class PhoneService {
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) env: Pick<Env, 'JWT_SECRET'>,
  ) {
    this.key = Buffer.from(`phone-code:${env.JWT_SECRET}`);
  }

  /** Off (404 AUTH_PROVIDER_DISABLED) until an SMS provider is configured. */
  get enabled(): boolean {
    return this.sms !== null;
  }

  assertEnabled(): void {
    this.require();
  }

  /** A fresh code for `phone`; any earlier code of the user stops working. */
  async sendCode(user: User, phone: string): Promise<void> {
    const sms = this.require();
    const now = this.clock.now();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.$transaction([
      this.prisma.phoneCode.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: now } }),
      this.prisma.phoneCode.create({
        data: {
          userId: user.id,
          phone,
          codeHash: this.hash(user.id, code),
          expiresAt: new Date(now.getTime() + PHONE_CODE_TTL_MS),
          createdAt: now,
        },
      }),
    ]);
    void sms.send(user, phone, code);
  }

  /**
   * Right code → the number is confirmed. Wrong code → 400; the fifth wrong code (and anything after
   * it) → 410 TOKEN_EXPIRED. Attempts are counted before comparing, so parallel guesses cannot exceed five.
   */
  async verify(userId: string, code: string): Promise<User> {
    this.require();
    const now = this.clock.now();
    const pending = await this.prisma.phoneCode.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending || pending.expiresAt <= now) throw expired();
    const counted = await this.prisma.phoneCode.updateMany({
      where: { id: pending.id, consumedAt: null, attempts: { lt: PHONE_CODE_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) throw expired();

    if (!this.matches(pending.codeHash, userId, code)) {
      const after = await this.prisma.phoneCode.findUniqueOrThrow({ where: { id: pending.id } });
      if (after.attempts >= PHONE_CODE_MAX_ATTEMPTS) {
        await this.prisma.phoneCode.update({ where: { id: pending.id }, data: { consumedAt: now } });
        throw expired();
      }
      throw new AppError('VALIDATION_FAILED', 400, 'Wrong code', { code: 'Wrong code' });
    }

    const used = await this.prisma.phoneCode.updateMany({
      where: { id: pending.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (used.count === 0) throw expired();
    return this.prisma.user.update({ where: { id: userId }, data: { phone: pending.phone, phoneVerifiedAt: now } });
  }

  private require(): SmsProvider {
    if (!this.sms) throw new AppError('AUTH_PROVIDER_DISABLED', 404, 'Phone confirmation is not available');
    return this.sms;
  }

  /** Keyed hash: a leaked table does not give away 6-digit codes by brute force. */
  private hash(userId: string, code: string): string {
    return createHmac('sha256', this.key).update(`${userId}:${code}`).digest('hex');
  }

  private matches(stored: string, userId: string, code: string): boolean {
    const expected = Buffer.from(stored, 'hex');
    const given = Buffer.from(this.hash(userId, code), 'hex');
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
