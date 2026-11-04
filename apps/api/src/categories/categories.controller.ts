import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesResponseSchema, type CategoriesResponse } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { CategoriesService } from './categories.service';

class CategoriesResponseDto extends createZodDto(CategoriesResponseSchema) {}

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Public reference data: the same for everyone, so shared caches may keep it for 5 minutes. */
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  @ZodResponse({ status: 200, type: CategoriesResponseDto, description: 'Active categories as a tree, with their attributes' })
  async list(): Promise<CategoriesResponse> {
    return { categories: await this.categories.tree() };
  }
}
