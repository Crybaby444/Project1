import { Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FollowFeedQuerySchema, FollowFeedSchema, FollowingIdsSchema, PeopleResponseSchema, PeopleSearchQuerySchema, type FollowFeed, type PeopleResponse, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { FollowsService } from './follows.service';

class PeopleDto extends createZodDto(PeopleResponseSchema) {}
class PeopleSearchQueryDto extends createZodDto(PeopleSearchQuerySchema) {}
class FollowingIdsDto extends createZodDto(FollowingIdsSchema) {}
class FollowFeedDto extends createZodDto(FollowFeedSchema) {}
class FollowFeedQueryDto extends createZodDto(FollowFeedQuerySchema) {}

/** Finding people (public). Registered before ProfilesController so `/users/search` is not taken for an id. */
@ApiTags('people')
@Controller('people')
export class PeopleController {
  constructor(private readonly follows: FollowsService) {}

  @Get()
  @ZodResponse({ status: 200, type: PeopleDto, description: 'People whose name matches, most followed first' })
  @ApiErrors(400)
  async search(@Query() query: PeopleSearchQueryDto): Promise<PeopleResponse> {
    return { items: await this.follows.search(query.q) };
  }
}

@ApiTags('people')
@Controller()
@UseGuards(AuthGuard)
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post('users/:id/follow')
  @HttpCode(204)
  @ApiErrors(401, 404, 409)
  async follow(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.follows.follow(user.id, id);
  }

  @Delete('users/:id/follow')
  @HttpCode(204)
  @ApiErrors(401)
  async unfollow(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.follows.unfollow(user.id, id);
  }

  @Get('me/following/ids')
  @ZodResponse({ status: 200, type: FollowingIdsDto, description: 'Who you follow (ids)' })
  @ApiErrors(401)
  async ids(@CurrentUser() user: PublicUser): Promise<{ ids: string[] }> {
    return { ids: await this.follows.followingIds(user.id) };
  }

  @Get('me/following')
  @ZodResponse({ status: 200, type: PeopleDto, description: 'The people you follow' })
  @ApiErrors(401)
  async following(@CurrentUser() user: PublicUser): Promise<PeopleResponse> {
    return { items: await this.follows.following(user.id) };
  }

  @Get('me/following/feed')
  @ZodResponse({ status: 200, type: FollowFeedDto, description: 'New items from the people you follow' })
  @ApiErrors(401)
  async feed(@CurrentUser() user: PublicUser, @Query() query: FollowFeedQueryDto): Promise<FollowFeed> {
    return this.follows.feed(user.id, query.page);
  }
}
