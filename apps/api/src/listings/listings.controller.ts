import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import {
  ListingDraftSchema,
  type MyListingsResponse,
  type OwnerListingResponse,
  type PublicUser,
  type UnavailabilityResponse,
} from '@yoyo/shared';
import type { Request } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { parseOptionalBody } from '../common/parse-body';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import {
  ListingDraftDto,
  ListingPatchDto,
  MyListingsQueryDto,
  MyListingsResponseDto,
  OwnerListingResponseDto,
  UnavailabilityRequestDto,
  UnavailabilityResponseDto,
} from './listings.dto';
import { ListingsService } from './listings.service';

/** The owner's side of listings. Someone else's listing does not exist here: every route answers 404. */
@ApiTags('listings')
@Controller('listings')
@UseGuards(AuthGuard)
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly limiter: RateLimiter,
  ) {}

  @Post()
  @ApiBody({ type: ListingDraftDto, required: false })
  @ZodResponse({ status: 201, type: OwnerListingResponseDto, description: 'A new draft' })
  @ApiErrors(400, 401, 403, 429)
  async create(@CurrentUser() user: PublicUser, @Req() req: Request): Promise<OwnerListingResponse> {
    const draft = parseOptionalBody(ListingDraftSchema, req.body);
    this.limiter.hit(RATE_LIMITS.createListing(user.id));
    return { listing: await this.listings.create(user.id, draft) };
  }

  @Get(':id')
  @ZodResponse({ status: 200, type: OwnerListingResponseDto, description: 'The whole listing (owner or administrator only)' })
  @ApiErrors(401, 403, 404)
  async get(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OwnerListingResponse> {
    return { listing: await this.listings.view(id, user) };
  }

  @Patch(':id')
  @ZodResponse({ status: 200, type: OwnerListingResponseDto, description: 'Saved; content changes of a live listing send it to review' })
  @ApiErrors(400, 401, 403, 404, 409)
  async update(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: ListingPatchDto): Promise<OwnerListingResponse> {
    return { listing: await this.listings.update(id, user.id, body) };
  }

  @Post(':id/submit')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OwnerListingResponseDto, description: 'Sent to review (PENDING_REVIEW)' })
  @ApiErrors(400, 401, 403, 404, 409)
  async submit(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OwnerListingResponse> {
    return { listing: await this.listings.submit(id, user.id) };
  }

  @Post(':id/hide')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OwnerListingResponseDto, description: 'Hidden from the catalog' })
  @ApiErrors(401, 403, 404, 409)
  async hide(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OwnerListingResponse> {
    return { listing: await this.listings.setVisibility(id, user.id, 'hide') };
  }

  @Post(':id/unhide')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OwnerListingResponseDto, description: 'Back in the catalog' })
  @ApiErrors(401, 403, 404, 409)
  async unhide(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OwnerListingResponse> {
    return { listing: await this.listings.setVisibility(id, user.id, 'unhide') };
  }

  @Put(':id/unavailability')
  @ZodResponse({ status: 200, type: UnavailabilityResponseDto, description: 'The unavailable days as stored: merged, sorted, past ones dropped' })
  @ApiErrors(400, 401, 403, 404, 409)
  async unavailability(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() body: UnavailabilityRequestDto,
  ): Promise<UnavailabilityResponse> {
    return this.listings.setUnavailability(id, user.id, body.periods, body.version);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Deleted (never published) or archived (was published)' })
  @ApiErrors(401, 403, 404, 409)
  async remove(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.listings.remove(id, user.id);
  }
}

@ApiTags('listings')
@Controller('me/listings')
@UseGuards(AuthGuard)
export class MyListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @ZodResponse({ status: 200, type: MyListingsResponseDto, description: 'My listings, last changed first (archived ones only when asked for)' })
  @ApiErrors(400, 401, 403)
  async list(@CurrentUser() user: PublicUser, @Query() query: MyListingsQueryDto): Promise<MyListingsResponse> {
    return { items: await this.listings.listMine(user.id, query.status) };
  }
}
