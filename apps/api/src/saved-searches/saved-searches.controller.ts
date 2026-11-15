import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SavedSearchListSchema, SavedSearchRequestSchema, SavedSearchSchema, type PublicUser, type SavedSearch, type SavedSearchList } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { SavedSearchesService } from './saved-searches.service';

class SavedSearchRequestDto extends createZodDto(SavedSearchRequestSchema) {}
class SavedSearchResponseDto extends createZodDto(z.object({ search: SavedSearchSchema })) {}
class SavedSearchListDto extends createZodDto(SavedSearchListSchema) {}

@ApiTags('saved-searches')
@Controller('me/saved-searches')
@UseGuards(AuthGuard)
export class SavedSearchesController {
  constructor(private readonly searches: SavedSearchesService) {}

  @Get()
  @ZodResponse({ status: 200, type: SavedSearchListDto, description: 'My saved searches, newest first' })
  @ApiErrors(401)
  async list(@CurrentUser() user: PublicUser): Promise<SavedSearchList> {
    return { items: await this.searches.list(user.id) };
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, type: SavedSearchResponseDto, description: 'Saves a search; the bell rings when a matching item is published' })
  @ApiErrors(400, 401, 409)
  async create(@CurrentUser() user: PublicUser, @Body() body: SavedSearchRequestDto): Promise<{ search: SavedSearch }> {
    return { search: await this.searches.create(user.id, body) };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiErrors(401, 404)
  async remove(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.searches.remove(user.id, id);
  }
}
