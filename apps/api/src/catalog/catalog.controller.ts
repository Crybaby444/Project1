import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
  CatalogPage,
  CatalogQuery,
  ItemAddress,
  ItemResponse,
  Locale,
  MapResponse,
  PlacesResponse,
  PublicProfile,
  SitemapResponse,
  SuggestResponse,
} from '@yoyo/shared';
import type { Request } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { clientIp } from '../common/request-meta';
import {
  CatalogPageDto,
  CatalogQueryDto,
  ItemAddressDto,
  ItemResponseDto,
  MapResponseDto,
  PlacesResponseDto,
  PublicProfileDto,
  SitemapResponseDto,
  SuggestQueryDto,
  SuggestResponseDto,
} from './catalog.dto';
import { CatalogService } from './catalog.service';
import { ProfilesService } from './profiles.service';

/**
 * The public catalog. The site's server calls most of it directly (no visitor address), so only the
 * suggestions, which browsers call through the site's proxy, have a limit per address.
 */
@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get('listings')
  @ZodResponse({ status: 200, type: CatalogPageDto, description: 'One page of visible items matching the query' })
  @ApiErrors(400)
  search(@Query() query: CatalogQueryDto): Promise<CatalogPage> {
    return this.catalog.search(query as CatalogQuery);
  }

  @Get('map')
  @ZodResponse({ status: 200, type: MapResponseDto, description: 'The same search as pins on a 0.01° grid (never the exact point)' })
  @ApiErrors(400)
  map(@Query() query: CatalogQueryDto): Promise<MapResponse> {
    return this.catalog.map(query as CatalogQuery);
  }

  @Get('suggest')
  @ZodResponse({ status: 200, type: SuggestResponseDto, description: 'Categories and items for a search box' })
  @ApiErrors(400, 429)
  suggest(@Query() query: SuggestQueryDto, @Req() req: Request): Promise<SuggestResponse> {
    this.limiter.hit(RATE_LIMITS.suggest(clientIp(req)));
    return this.catalog.suggest(query.q, query.lang as Locale);
  }

  @Get('places')
  @ZodResponse({ status: 200, type: PlacesResponseDto, description: 'Districts that have items' })
  places(): Promise<PlacesResponse> {
    return this.catalog.places();
  }

  @Get('sitemap')
  @ZodResponse({ status: 200, type: SitemapResponseDto, description: 'What the site’s sitemaps list' })
  sitemap(): Promise<SitemapResponse> {
    return this.catalog.sitemap();
  }

  @Get('listings/:id/address')
  @ZodResponse({ status: 200, type: ItemAddressDto, description: 'The slug and language of an item page' })
  @ApiErrors(404, 410)
  address(@Param('id') id: string): Promise<ItemAddress> {
    return this.catalog.address(id);
  }

  @Get('listings/:id')
  @ZodResponse({ status: 200, type: ItemResponseDto, description: 'An item page: available, or away for now (similar items instead)' })
  @ApiErrors(404, 410)
  async item(@Param('id') id: string): Promise<ItemResponse> {
    return { item: await this.catalog.item(id) };
  }
}

@ApiTags('catalog')
@Controller('users')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get(':id')
  @ZodResponse({ status: 200, type: PublicProfileDto, description: 'A public profile and the person’s items' })
  @ApiErrors(404)
  profile(@Param('id') id: string): Promise<PublicProfile> {
    return this.profiles.profile(id);
  }
}
