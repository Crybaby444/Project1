import { Body, Controller, Get, Headers, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAnalyticsSchema, AdminSeoSchema, AnalyticsHitSchema, type AdminAnalytics, type AdminSeo } from '@yoyo/shared';
import type { Request } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { clientIp } from '../common/request-meta';
import { AnalyticsService } from './analytics.service';

class AnalyticsHitDto extends createZodDto(AnalyticsHitSchema) {}
class AdminAnalyticsDto extends createZodDto(AdminAnalyticsSchema) {}
class AdminSeoDto extends createZodDto(AdminSeoSchema) {}
class AnalyticsQueryDto extends createZodDto(z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30) })) {}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly limiter: RateLimiter,
  ) {}

  /** A page view from the site's own counter: no cookie, nothing about the person is kept. */
  @Post('hit')
  @HttpCode(204)
  @ApiErrors(400, 429)
  async hit(@Req() req: Request, @Headers('user-agent') userAgent: string | undefined, @Body() body: AnalyticsHitDto): Promise<void> {
    this.limiter.hit(RATE_LIMITS.analytics(clientIp(req)));
    await this.analytics.hit(body, userAgent ?? '');
  }
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('analytics')
  @ZodResponse({ status: 200, type: AdminAnalyticsDto, description: 'Traffic over the last 7, 30 or 90 days (first-party, cookieless counters)' })
  @ApiErrors(400, 401, 403)
  report(@Query() query: AnalyticsQueryDto): Promise<AdminAnalytics> {
    return this.analytics.report(query.days);
  }

  @Get('seo')
  @ZodResponse({ status: 200, type: AdminSeoDto, description: 'What holds published items back in search engines, worst first' })
  @ApiErrors(401, 403)
  seo(): Promise<AdminSeo> {
    return this.analytics.seo();
  }
}
