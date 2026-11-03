import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseSchema, type HealthResponse } from '@yoyo/shared';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../prisma/prisma.service';
import { API_VERSION } from '../version';

class HealthResponseDto extends createZodDto(HealthResponseSchema) {}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto, description: 'API and database are up' })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto, description: 'Database is unreachable' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const up = await this.prisma.isHealthy();
    if (!up) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: up ? 'ok' : 'degraded', db: up ? 'up' : 'down', version: API_VERSION };
  }
}
