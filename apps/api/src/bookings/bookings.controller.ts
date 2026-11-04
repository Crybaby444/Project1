import { Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  BookingPhotoResponseSchema,
  BookingPhotosResponseSchema,
  BookingPhotoUploadQuerySchema,
  LISTING_LIMITS,
  type BookingPhotoResponse,
  type BookingPhotosResponse,
  BookingActionRequestSchema,
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
import { AppError } from '../common/app-error';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { Idempotent } from '../idempotency/idempotent.decorator';
import { BookingPhotosService } from './booking-photos.service';
import { BookingsService } from './bookings.service';

class BookingPhotoResponseDto extends createZodDto(BookingPhotoResponseSchema) {}
class BookingPhotosResponseDto extends createZodDto(BookingPhotosResponseSchema) {}
class BookingPhotoUploadQueryDto extends createZodDto(BookingPhotoUploadQuerySchema) {}
class BookingActionRequestDto extends createZodDto(BookingActionRequestSchema) {}
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
    private readonly photos: BookingPhotosService,
    private readonly limiter: RateLimiter,
  ) {}

  /** One photo per request in the `file` field (10 MB, JPEG/PNG/WebP), like listing photos. */
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LISTING_LIMITS.photoBytes, files: 1, fields: 5, parts: 6 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @ZodResponse({ status: 201, type: BookingPhotoResponseDto, description: 'Stored, cleaned of metadata' })
  @ApiErrors(400, 401, 403, 404, 409, 413, 415, 429, 503)
  async upload(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Query() query: BookingPhotoUploadQueryDto,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<BookingPhotoResponse> {
    if (!file) throw new AppError('VALIDATION_FAILED', 400, undefined, { file: 'Attach the photo in the "file" field' });
    this.limiter.hit(RATE_LIMITS.photoUpload(user.id));
    return { photo: await this.photos.add(id, user, query.kind, file.buffer) };
  }

  @Get(':id/photos')
  @ZodResponse({ status: 200, type: BookingPhotosResponseDto, description: 'Handover, return and damage photos, oldest first' })
  @ApiErrors(401, 403, 404)
  async listPhotos(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<BookingPhotosResponse> {
    return { items: await this.photos.list(id, user) };
  }

  @Post()
  @Idempotent({ required: false })
  @ZodResponse({ status: 201, type: BookingResponseDto, description: 'The request, waiting for the owner (REQUESTED)' })
  @ApiErrors(400, 401, 403, 404, 409, 429)
  async create(@CurrentUser() user: PublicUser, @Body() body: BookingRequestDto): Promise<BookingResponse> {
    this.limiter.hit(RATE_LIMITS.bookingRequest(user.id));
    return { booking: await this.bookings.create(user, body) };
  }

  @Post(':id/events')
  @HttpCode(200)
  @Idempotent({ required: true })
  @ZodResponse({ status: 200, type: BookingResponseDto, description: 'The step was taken; the deal as it is now' })
  @ApiErrors(400, 401, 402, 403, 404, 409)
  async act(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: BookingActionRequestDto): Promise<BookingResponse> {
    return { booking: await this.bookings.act(id, user, body.version, body.event) };
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
