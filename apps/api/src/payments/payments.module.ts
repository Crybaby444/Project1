import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { FakeCardProvider } from './fake-card.provider';
import { PAYMENT_PROVIDER } from './payment.provider';
import { PaymentsController } from './payments.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ENV, CLOCK],
      // PAYMENTS has one value today ("fake"); a real provider is another class behind PaymentProvider.
      useFactory: (env: Env, clock: Clock) => new FakeCardProvider(env.JWT_SECRET, clock),
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
