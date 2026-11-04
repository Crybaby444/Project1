import {
  ListingDraftSchema,
  ListingPatchSchema,
  MyListingsQuerySchema,
  MyListingsResponseSchema,
  OwnerListingResponseSchema,
  UnavailabilityRequestSchema,
  UnavailabilityResponseSchema,
} from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class ListingDraftDto extends createZodDto(ListingDraftSchema) {}
export class ListingPatchDto extends createZodDto(ListingPatchSchema) {}
export class MyListingsQueryDto extends createZodDto(MyListingsQuerySchema) {}
export class MyListingsResponseDto extends createZodDto(MyListingsResponseSchema) {}
export class OwnerListingResponseDto extends createZodDto(OwnerListingResponseSchema) {}
export class UnavailabilityRequestDto extends createZodDto(UnavailabilityRequestSchema) {}
export class UnavailabilityResponseDto extends createZodDto(UnavailabilityResponseSchema) {}
