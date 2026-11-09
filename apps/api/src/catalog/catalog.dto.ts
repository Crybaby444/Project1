import {
  CatalogPageSchema,
  CatalogQuerySchema,
  ItemAddressSchema,
  ItemResponseSchema,
  MapResponseSchema,
  PlacesResponseSchema,
  PublicProfileSchema,
  SitemapResponseSchema,
  SuggestQuerySchema,
  SuggestResponseSchema,
} from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class CatalogQueryDto extends createZodDto(CatalogQuerySchema) {}
export class CatalogPageDto extends createZodDto(CatalogPageSchema) {}
export class MapResponseDto extends createZodDto(MapResponseSchema) {}
export class SuggestQueryDto extends createZodDto(SuggestQuerySchema) {}
export class SuggestResponseDto extends createZodDto(SuggestResponseSchema) {}
export class PlacesResponseDto extends createZodDto(PlacesResponseSchema) {}
export class ItemAddressDto extends createZodDto(ItemAddressSchema) {}
export class ItemResponseDto extends createZodDto(ItemResponseSchema) {}
export class SitemapResponseDto extends createZodDto(SitemapResponseSchema) {}
export class PublicProfileDto extends createZodDto(PublicProfileSchema) {}
