import { Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import {
  FavoriteIdsResponseSchema,
  FavoritesResponseSchema,
  type FavoriteIdsResponse,
  type FavoritesResponse,
  type PublicUser,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { FavoritesService } from './favorites.service';

class FavoriteIdsResponseDto extends createZodDto(FavoriteIdsResponseSchema) {}
class FavoritesResponseDto extends createZodDto(FavoritesResponseSchema) {}

@ApiTags('favorites')
@Controller('me/favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(
    private readonly favorites: FavoritesService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: FavoritesResponseDto, description: 'My favourites, newest first; ones that left the catalog with available: false' })
  @ApiErrors(401, 403)
  async list(@CurrentUser() user: PublicUser): Promise<FavoritesResponse> {
    return { items: await this.favorites.list(user.id) };
  }

  @Get('ids')
  @ZodResponse({ status: 200, type: FavoriteIdsResponseDto, description: 'Ids of my favourites the catalog shows' })
  @ApiErrors(401, 403)
  async ids(@CurrentUser() user: PublicUser): Promise<FavoriteIdsResponse> {
    return { ids: await this.favorites.ids(user.id) };
  }

  @Put(':listingId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'In my favourites (also when it already was)' })
  @ApiErrors(401, 403, 404, 429)
  async add(@CurrentUser() user: PublicUser, @Param('listingId') listingId: string): Promise<void> {
    this.limiter.hit(RATE_LIMITS.favorite(user.id));
    await this.favorites.add(user.id, listingId);
  }

  @Delete(':listingId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Not in my favourites (also when it was not)' })
  @ApiErrors(401, 403, 429)
  async remove(@CurrentUser() user: PublicUser, @Param('listingId') listingId: string): Promise<void> {
    this.limiter.hit(RATE_LIMITS.favorite(user.id));
    await this.favorites.remove(user.id, listingId);
  }
}
