import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { FakeCardProvider } from './fake-card.provider';
import { StripePaymentProvider } from './stripe.provider';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PAYMENT_PROVIDER } from './payment.provider';
import { MoneyOutService } from './money-out.service';
import { PaymentsController } from './payments.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ENV, CLOCK],
      // `fake` (test cards, the default) or `stripe` (owner, 2026-11-16: ready, switched on later).
      useFactory: (env: Env, clock: Clock) =>
        env.PAYMENTS === 'stripe' && env.STRIPE_SECRET_KEY
          ? new StripePaymentProvider({ secretKey: env.STRIPE_SECRET_KEY, apiUrl: env.STRIPE_API_URL })
          : new FakeCardProvider(env.JWT_SECRET, clock),
    },
    MoneyOutService,
  ],
  exports: [PAYMENT_PROVIDER, MoneyOutService],
})
export class PaymentsModule {}
