import { Module } from '@nestjs/common';
import { EnvModule } from './config/env.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [EnvModule, PrismaModule, HealthModule],
})
export class AppModule {}
