import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorBodySchema } from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class ApiErrorDto extends createZodDto(ApiErrorBodySchema) {}

const DESCRIPTIONS: Record<number, string> = {
  400: 'Invalid input (VALIDATION_FAILED, with fields)',
  401: 'Not signed in or wrong credentials',
  403: 'Not allowed (blocked account, wrong role or foreign Origin)',
  404: 'Not found or not available',
  409: 'Conflict (e.g. AUTH_EMAIL_TAKEN)',
  410: 'Link or code used up (TOKEN_USED) or expired (TOKEN_EXPIRED)',
  429: 'Too many attempts (RATE_LIMITED); see Retry-After',
};

/** Documents the uniform error body for the given statuses. */
export function ApiErrors(...statuses: number[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ...statuses.map((status) => ApiResponse({ status, type: ApiErrorDto.Output, description: DESCRIPTIONS[status] })),
  );
}
