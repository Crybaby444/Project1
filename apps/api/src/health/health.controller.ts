import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { API_VERSION } from '../version';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const dbUp = await this.prisma.isHealthy();
    res.status(dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return dbUp
      ? { status: 'ok' as const, db: 'up' as const, version: API_VERSION }
      : { status: 'degraded' as const, db: 'down' as const, version: API_VERSION };
  }
}
