import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  GeoReverseQuerySchema,
  GeoReverseResponseSchema,
  GeoSearchQuerySchema,
  GeoSearchResponseSchema,
  type GeoReverseResponse,
  type GeoSearchResponse,
  type PublicUser,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { GeoService } from './geo.service';

class GeoSearchQueryDto extends createZodDto(GeoSearchQuerySchema) {}
class GeoReverseQueryDto extends createZodDto(GeoReverseQuerySchema) {}
class GeoSearchResponseDto extends createZodDto(GeoSearchResponseSchema) {}
class GeoReverseResponseDto extends createZodDto(GeoReverseResponseSchema) {}

/** Address search for the point of a listing. Show `attribution` wherever the results appear. */
@ApiTags('geo')
@Controller('geo')
@UseGuards(AuthGuard)
export class GeoController {
  constructor(
    private readonly geo: GeoService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get('search')
  @ZodResponse({ status: 200, type: GeoSearchResponseDto, description: 'Up to 5 places' })
  @ApiErrors(400, 401, 403, 429, 503)
  async search(@CurrentUser() user: PublicUser, @Query() query: GeoSearchQueryDto): Promise<GeoSearchResponse> {
    this.limiter.hit(RATE_LIMITS.geo(user.id));
    return this.geo.search(query.q, query.lang);
  }

  @Get('reverse')
  @ZodResponse({ status: 200, type: GeoReverseResponseDto, description: 'City and district of a point (null when unknown)' })
  @ApiErrors(400, 401, 403, 429, 503)
  async reverse(@CurrentUser() user: PublicUser, @Query() query: GeoReverseQueryDto): Promise<GeoReverseResponse> {
    this.limiter.hit(RATE_LIMITS.geo(user.id));
    return this.geo.reverse(query.lat, query.lng, query.lang);
  }
}
