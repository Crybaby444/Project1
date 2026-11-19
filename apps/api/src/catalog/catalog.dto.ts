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
  CatalogItemsQuerySchema,
  CatalogItemsResponseSchema,
  ForYouResponseSchema,
  CitySuggestQuerySchema,
  CitySuggestResponseSchema,
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
export class CatalogItemsQueryDto extends createZodDto(CatalogItemsQuerySchema) {}
export class CatalogItemsResponseDto extends createZodDto(CatalogItemsResponseSchema) {}
export class ForYouResponseDto extends createZodDto(ForYouResponseSchema) {}
export class CitySuggestQueryDto extends createZodDto(CitySuggestQuerySchema) {}
export class CitySuggestResponseDto extends createZodDto(CitySuggestResponseSchema) {}
export class ItemAddressDto extends createZodDto(ItemAddressSchema) {}
export class ItemResponseDto extends createZodDto(ItemResponseSchema) {}
export class SitemapResponseDto extends createZodDto(SitemapResponseSchema) {}
export class PublicProfileDto extends createZodDto(PublicProfileSchema) {}
