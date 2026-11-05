import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  MyOffersQuerySchema,
  OfferRequestSchema,
  OfferResponseSchema,
  OffersResponseSchema,
  type OfferResponse,
  type OffersResponse,
  type PublicUser,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { Idempotent } from '../idempotency/idempotent.decorator';
import { OffersService } from './offers.service';

class OfferRequestDto extends createZodDto(OfferRequestSchema) {}
class OfferResponseDto extends createZodDto(OfferResponseSchema) {}
class OffersResponseDto extends createZodDto(OffersResponseSchema) {}
class MyOffersQueryDto extends createZodDto(MyOffersQuerySchema) {}

@ApiTags('offers')
@Controller()
@UseGuards(AuthGuard)
export class OffersController {
  constructor(
    private readonly offers: OffersService,
    private readonly limiter: RateLimiter,
  ) {}

  @Post('listings/:id/offers')
  @Idempotent({ required: false })
  @ZodResponse({ status: 201, type: OfferResponseDto, description: 'The offer, waiting for the owner (24 hours at most)' })
  @ApiErrors(400, 401, 403, 404, 409, 429)
  async create(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: OfferRequestDto): Promise<OfferResponse> {
    this.limiter.hit(RATE_LIMITS.offer(user.id));
    return { offer: await this.offers.create(user, id, body) };
  }

  @Get('me/offers')
  @ZodResponse({ status: 200, type: OffersResponseDto, description: 'Offers I made (renter) or got (owner), newest first' })
  @ApiErrors(400, 401, 403)
  async list(@CurrentUser() user: PublicUser, @Query() query: MyOffersQueryDto): Promise<OffersResponse> {
    return { items: await this.offers.listMine(user, query.role) };
  }

  @Post('offers/:id/accept')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OfferResponseDto, description: 'Accepted: the renter can book these days at this price' })
  @ApiErrors(401, 403, 404, 409)
  async accept(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OfferResponse> {
    return { offer: await this.offers.answer(user, id, true) };
  }

  @Post('offers/:id/decline')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OfferResponseDto, description: 'Declined' })
  @ApiErrors(401, 403, 404, 409)
  async decline(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OfferResponse> {
    return { offer: await this.offers.answer(user, id, false) };
  }

  @Post('offers/:id/withdraw')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OfferResponseDto, description: 'Withdrawn by the renter' })
  @ApiErrors(401, 403, 404, 409)
  async withdraw(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<OfferResponse> {
    return { offer: await this.offers.withdraw(user, id) };
  }
}
