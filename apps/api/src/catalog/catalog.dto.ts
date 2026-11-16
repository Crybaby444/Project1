import {
  CategoryCountsSchema,
  CatalogPageSchema,
  CatalogQuerySchema,
  ItemAddressSchema,
  ItemResponseSchema,
  MapResponseSchema,
  PlacesResponseSchema,
  PlacesQuerySchema,
  ForYouQuerySchema,
  ForYouResponseSchema,
  PublicProfileSchema,
  SitemapResponseSchema,
  SuggestQuerySchema,
  SuggestResponseSchema,
} from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class CatalogQueryDto extends createZodDto(CatalogQuerySchema) {}
export class CatalogPageDto extends createZodDto(CatalogPageSchema) {}
export class CategoryCountsDto extends createZodDto(CategoryCountsSchema) {}
export class MapResponseDto extends createZodDto(MapResponseSchema) {}
export class SuggestQueryDto extends createZodDto(SuggestQuerySchema) {}
export class SuggestResponseDto extends createZodDto(SuggestResponseSchema) {}
export class PlacesResponseDto extends createZodDto(PlacesResponseSchema) {}
export class PlacesQueryDto extends createZodDto(PlacesQuerySchema) {}
export class ForYouQueryDto extends createZodDto(ForYouQuerySchema) {}
export class ForYouResponseDto extends createZodDto(ForYouResponseSchema) {}
export class ItemAddressDto extends createZodDto(ItemAddressSchema) {}
export class ItemResponseDto extends createZodDto(ItemResponseSchema) {}
export class SitemapResponseDto extends createZodDto(SitemapResponseSchema) {}
export class PublicProfileDto extends createZodDto(PublicProfileSchema) {}
