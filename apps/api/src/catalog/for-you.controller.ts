import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ForYouResponse, PublicUser } from '@yoyo/shared';
import { ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { ForYouQueryDto, ForYouResponseDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

/** The signed-in person's "For you": their favourites, rentals and follows count too; their own items never. */
@ApiTags('catalog')
@Controller('me/for-you')
@UseGuards(AuthGuard)
export class ForYouController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ZodResponse({ status: 200, type: ForYouResponseDto, description: 'Items ranked by popularity and this person’s interests' })
  @ApiErrors(400, 401)
  forYou(@CurrentUser() user: PublicUser, @Query() query: ForYouQueryDto): Promise<ForYouResponse> {
    return this.catalog.forYou({ ...(query.country && { country: query.country }), categories: query.categories, userId: user.id });
  }
}
