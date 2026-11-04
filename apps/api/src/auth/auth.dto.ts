import { EmailTokenRequestSchema, RegisterRequestSchema, UserResponseSchema } from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDto extends createZodDto(RegisterRequestSchema) {}
export class EmailTokenDto extends createZodDto(EmailTokenRequestSchema) {}
export class UserResponseDto extends createZodDto(UserResponseSchema) {}
