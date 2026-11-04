import { ListingDraftSchema, ListingPatchSchema, MyListingsQuerySchema, MyListingsResponseSchema, OwnerListingResponseSchema } from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class ListingDraftDto extends createZodDto(ListingDraftSchema) {}
export class ListingPatchDto extends createZodDto(ListingPatchSchema) {}
export class MyListingsQueryDto extends createZodDto(MyListingsQuerySchema) {}
export class MyListingsResponseDto extends createZodDto(MyListingsResponseSchema) {}
export class OwnerListingResponseDto extends createZodDto(OwnerListingResponseSchema) {}
