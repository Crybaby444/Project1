import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { AuthModule } from './auth/auth.module';
import { ClockModule } from './clock/clock';
import { OriginGuard } from './common/origin.guard';
import { RateLimiterModule } from './common/rate-limiter';
import { ENV, loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv(process.env) }],
  exports: [ENV],
})
class EnvModule {}

@Module({
  imports: [EnvModule, ClockModule, PrismaModule, RateLimiterModule, SettingsModule, AuthModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    // Responses declared with @ZodResponse are parsed by their schema: unknown fields never leave the API.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
