import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  BookingRequestSchema,
  BookingResponseSchema,
  BookingsPageSchema,
  MyBookingsQuerySchema,
  QuoteQuerySchema,
  QuoteResponseSchema,
  type BookingResponse,
  type BookingsPage,
  type PublicUser,
  type QuoteResponse,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { Idempotent } from '../idempotency/idempotent.decorator';
import { BookingsService } from './bookings.service';

class BookingRequestDto extends createZodDto(BookingRequestSchema) {}
class BookingResponseDto extends createZodDto(BookingResponseSchema) {}
class BookingsPageDto extends createZodDto(BookingsPageSchema) {}
class MyBookingsQueryDto extends createZodDto(MyBookingsQuerySchema) {}
class QuoteQueryDto extends createZodDto(QuoteQuerySchema) {}
class QuoteResponseDto extends createZodDto(QuoteResponseSchema) {}

/** Deals: one side's or an administrator's view; to anyone else a deal does not exist (404). */
@ApiTags('bookings')
@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly limiter: RateLimiter,
  ) {}

  @Post()
  @Idempotent({ required: false })
  @ZodResponse({ status: 201, type: BookingResponseDto, description: 'The request, waiting for the owner (REQUESTED)' })
  @ApiErrors(400, 401, 403, 404, 409, 429)
  async create(@CurrentUser() user: PublicUser, @Body() body: BookingRequestDto): Promise<BookingResponse> {
    this.limiter.hit(RATE_LIMITS.bookingRequest(user.id));
    return { booking: await this.bookings.create(user, body) };
  }

  @Get(':id')
  @ZodResponse({ status: 200, type: BookingResponseDto, description: 'The deal, with what the viewer can do now' })
  @ApiErrors(401, 403, 404)
  async get(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<BookingResponse> {
    return { booking: await this.bookings.view(id, user) };
  }
}

@ApiTags('bookings')
@Controller('me/bookings')
@UseGuards(AuthGuard)
export class MyBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ZodResponse({ status: 200, type: BookingsPageDto, description: 'My deals as renter or owner, last changed first, 20 a page' })
  @ApiErrors(400, 401, 403)
  list(@CurrentUser() user: PublicUser, @Query() query: MyBookingsQueryDto): Promise<BookingsPage> {
    return this.bookings.listMine(user, query.role, query.status, query.page);
  }
}

/** The price calculator of a listing card: public, like the card itself (plan 7). */
@ApiTags('bookings')
@Controller('listings')
export class ListingQuoteController {
  constructor(private readonly bookings: BookingsService) {}

  @Get(':id/quote')
  @ZodResponse({ status: 200, type: QuoteResponseDto, description: 'Rent, fee, deposit and total for these days, and the days already taken' })
  @ApiErrors(400, 404)
  quote(@Param('id') id: string, @Query() query: QuoteQueryDto): Promise<QuoteResponse> {
    return this.bookings.quote(id, query.start, query.end);
  }
}
