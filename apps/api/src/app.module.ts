import { Module } from '@nestjs/common';
import { EnvModule } from './config/env.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [EnvModule, PrismaModule, SettingsModule, HealthModule],
})
export class AppModule {}
