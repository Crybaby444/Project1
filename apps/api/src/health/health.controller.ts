import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { API_VERSION } from '../config/version.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const up = await this.prisma.isHealthy();
    if (!up) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return up
      ? { status: 'ok' as const, db: 'up' as const, version: API_VERSION }
      : { status: 'degraded' as const, db: 'down' as const, version: API_VERSION };
  }
}
