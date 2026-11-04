import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { OffersModule } from './offers/offers.module';
import { CategoriesModule } from './categories/categories.module';
import { ClockModule } from './clock/clock';
import { OriginGuard } from './common/origin.guard';
import { RateLimiterModule } from './common/rate-limiter';
import { ENV, loadEnv } from './config/env';
import { GeoModule } from './geo/geo.module';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';
import { LedgerModule } from './ledger/ledger.module';
import { HealthController } from './health/health.controller';
import { ListingsModule } from './listings/listings.module';
import { MediaModule } from './media/media.module';
import { MeModule } from './me/me.module';
import { ModerationModule } from './moderation/moderation.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { SettingsModule } from './settings/settings.module';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv(process.env) }],
  exports: [ENV],
})
class EnvModule {}

@Module({
  imports: [
    EnvModule,
    ClockModule,
    PrismaModule,
    LedgerModule,
    PaymentsModule,
    RateLimiterModule,
    SettingsModule,
    AuthModule,
    MeModule,
    AdminModule,
    CategoriesModule,
    ListingsModule,
    MediaModule,
    ModerationModule,
    GeoModule,
    WalletModule,
    BookingsModule,
    OffersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    // Before the serializer: a repeated request gets exactly the body the first one sent (plan 8).
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    // Responses declared with @ZodResponse are parsed by their schema: unknown fields never leave the API.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
