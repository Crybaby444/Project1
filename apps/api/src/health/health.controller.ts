import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type HealthResponse, HealthResponseSchema } from '@yoyo/shared';
import type { Response } from 'express';
import { API_VERSION } from '../config/version.js';
import { zodToOpenApi } from '../openapi.js';
import { PrismaService } from '../prisma/prisma.service.js';

const healthSchema = zodToOpenApi(HealthResponseSchema);

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ operationId: 'getHealth', summary: 'Service and database health' })
  @ApiResponse({ status: 200, description: 'API and database are up', schema: healthSchema })
  @ApiResponse({ status: 503, description: 'Database is unreachable', schema: healthSchema })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const up = await this.prisma.isHealthy();
    if (!up) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return up
      ? { status: 'ok', db: 'up', version: API_VERSION }
      : { status: 'degraded', db: 'down', version: API_VERSION };
  }
}
