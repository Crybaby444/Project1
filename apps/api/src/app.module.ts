import { Global, Module } from '@nestjs/common';
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
  imports: [EnvModule, PrismaModule, SettingsModule],
  controllers: [HealthController],
})
export class AppModule {}
