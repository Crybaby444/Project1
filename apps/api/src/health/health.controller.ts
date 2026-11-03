import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { API_VERSION } from '../version';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  version: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const up = await this.prisma.isHealthy();
    if (!up) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: up ? 'ok' : 'degraded', db: up ? 'up' : 'down', version: API_VERSION };
  }
}
