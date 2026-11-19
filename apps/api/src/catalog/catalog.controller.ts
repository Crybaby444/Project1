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
  ForYouResponse,
  CatalogItemsResponse,
  CitySuggestResponse,
  PublicProfile,
  SitemapResponse,
  SuggestResponse,
  CategoryCounts,
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
  CategoryCountsDto,
  ItemAddressDto,
  ItemResponseDto,
  MapResponseDto,
  PlacesQueryDto,
  ForYouQueryDto,
  ForYouResponseDto,
  CatalogItemsQueryDto,
  CatalogItemsResponseDto,
  CitySuggestQueryDto,
  CitySuggestResponseDto,
  PlacesResponseDto,
  PublicProfileDto,
  SitemapResponseDto,
  SuggestQueryDto,
  SuggestResponseDto,
} from './catalog.dto';
import { CityDirectory } from './city-directory';
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
    private readonly directory: CityDirectory,
  ) {}

  @Get('category-counts')
  @ZodResponse({ status: 200, type: CategoryCountsDto, description: 'Visible items per category, for the catalog index' })
  categoryCounts(): Promise<CategoryCounts> {
    return this.catalog.categoryCounts();
  }

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
  @ZodResponse({ status: 200, type: PlacesResponseDto, description: 'Countries with items, and the cities and districts of one country (or all)' })
  @ApiErrors(400)
  places(@Query() query: PlacesQueryDto): Promise<PlacesResponse> {
    return this.catalog.places(query.country);
  }

  @Get('items')
  @ZodResponse({ status: 200, type: CatalogItemsResponseDto, description: 'The given items that are still visible, as they are now, in the order asked' })
  @ApiErrors(400)
  async byIds(@Query() query: CatalogItemsQueryDto): Promise<CatalogItemsResponse> {
    return { items: await this.catalog.items(query.ids) };
  }

  @Get('for-you')
  @ZodResponse({ status: 200, type: ForYouResponseDto, description: 'Popular items of the country, lifted by the categories this browser looked at' })
  @ApiErrors(400)
  forYou(@Query() query: ForYouQueryDto): Promise<ForYouResponse> {
    return this.catalog.forYou({ ...(query.country && { country: query.country }), categories: query.categories });
  }

  @Get('cities')
  @ZodResponse({ status: 200, type: CitySuggestResponseDto, description: 'Cities of a country that start with what was typed, with their item counts' })
  @ApiErrors(400, 429)
  async cities(@Query() query: CitySuggestQueryDto, @Req() req: Request): Promise<CitySuggestResponse> {
    this.limiter.hit(RATE_LIMITS.suggest(clientIp(req)));
    const found = await this.directory.suggest(query.country, query.q);
    const counts = new Map((await this.catalog.places(query.country)).cities.map((c) => [c.slug, c.count]));
    return { items: found.map((city) => ({ ...city, count: counts.get(city.slug) ?? 0 })) };
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
