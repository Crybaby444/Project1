import { HealthResponseSchema } from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
