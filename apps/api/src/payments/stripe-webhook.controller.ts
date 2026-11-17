import { Controller, HttpCode, Inject, Logger, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { verifyStripeSignature } from './stripe.provider';

/**
 * Stripe's webhook (PAYMENTS=stripe): only events Stripe signed are read. Yoyo's own calls already know
 * their outcome (charges confirm at once, idempotent keys), so events are logged for reconciliation; a
 * failed or disputed payment shows in the server log for the team. Off (404) without the signing secret.
 */
@ApiExcludeController()
@Controller('payments/stripe/webhook')
export class StripeWebhookController {
  private readonly logger = new Logger('StripeWebhook');

  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'STRIPE_WEBHOOK_SECRET'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Post()
  @HttpCode(204)
  receive(@Req() req: Request & { rawBody?: Buffer }): void {
    const secret = this.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new AppError('NOT_FOUND', 404);
    const payload = req.rawBody?.toString('utf8') ?? '';
    if (!verifyStripeSignature(payload, req.header('stripe-signature'), secret, this.clock.now())) {
      throw new AppError('AUTH_FORBIDDEN', 403, 'Bad Stripe signature');
    }
    const event = JSON.parse(payload) as { id?: string; type?: string };
    const level = /failed|dispute|refund\.failed/.test(event.type ?? '') ? 'warn' : 'log';
    this.logger[level](`${event.type ?? 'event'} ${event.id ?? ''}`);
  }
}
