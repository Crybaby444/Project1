import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@yoyo/shared';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { API_VERSION } from '../version';
import { HealthResponseDto } from './health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ operationId: 'getHealth', summary: 'Service and database health' })
  @ApiResponse({ status: HttpStatus.OK, type: HealthResponseDto, description: 'All systems up' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    type: HealthResponseDto,
    description: 'API is up, database is unreachable',
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const dbUp = await this.prisma.isHealthy();
    res.status(dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return dbUp
      ? { status: 'ok', db: 'up', version: API_VERSION }
      : { status: 'degraded', db: 'down', version: API_VERSION };
  }
}
