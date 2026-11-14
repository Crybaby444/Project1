import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  DealReviewsSchema,
  PublicReviewSchema,
  ReviewPageSchema,
  ReviewRequestSchema,
  type DealReviews,
  type PublicReview,
  type PublicUser,
  type ReviewPage,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { ReviewsService } from './reviews.service';

class ReviewRequestDto extends createZodDto(ReviewRequestSchema) {}
class ReviewResponseDto extends createZodDto(z.object({ review: PublicReviewSchema })) {}
class DealReviewsDto extends createZodDto(DealReviewsSchema) {}
class ReviewPageDto extends createZodDto(ReviewPageSchema) {}
class PageQueryDto extends createZodDto(z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) })) {}

@ApiTags('reviews')
@Controller('bookings/:id/reviews')
@UseGuards(AuthGuard)
export class DealReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: DealReviewsDto, description: "This deal's reviews as a side of it sees them (blind until both wrote or the window closed)" })
  @ApiErrors(401, 403, 404)
  get(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<DealReviews> {
    return this.reviews.dealReviews(user.id, id);
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, type: ReviewResponseDto, description: 'My review of the other side (and, as the renter, of the item)' })
  @ApiErrors(400, 401, 403, 404, 409, 429)
  async create(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: ReviewRequestDto): Promise<{ review: PublicReview }> {
    this.limiter.hit(RATE_LIMITS.review(user.id));
    return { review: await this.reviews.create(user.id, id, body) };
  }
}

@ApiTags('reviews')
@Controller()
export class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('users/:id/reviews')
  @ZodResponse({ status: 200, type: ReviewPageDto, description: 'Public reviews about a person, newest first' })
  forUser(@Param('id') id: string, @Query() query: PageQueryDto): Promise<ReviewPage> {
    return this.reviews.forUser(id, query.page);
  }

  @Get('catalog/listings/:id/reviews')
  @ZodResponse({ status: 200, type: ReviewPageDto, description: "The renters' public reviews of an item, newest first" })
  forListing(@Param('id') id: string, @Query() query: PageQueryDto): Promise<ReviewPage> {
    return this.reviews.forListing(id, query.page);
  }
}
