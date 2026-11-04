import {
  ChangePasswordRequestSchema,
  DeleteAccountRequestSchema,
  PhoneRequestSchema,
  PhoneVerifyRequestSchema,
  UpdateProfileRequestSchema,
} from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateProfileDto extends createZodDto(UpdateProfileRequestSchema) {}
export class ChangePasswordDto extends createZodDto(ChangePasswordRequestSchema) {}
export class DeleteAccountDto extends createZodDto(DeleteAccountRequestSchema) {}
export class PhoneDto extends createZodDto(PhoneRequestSchema) {}
export class PhoneVerifyDto extends createZodDto(PhoneVerifyRequestSchema) {}
