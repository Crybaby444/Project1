import {
  EmailTokenRequestSchema,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  RegisterRequestSchema,
  ResetPasswordRequestSchema,
  UserResponseSchema,
} from '@yoyo/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDto extends createZodDto(RegisterRequestSchema) {}
export class LoginDto extends createZodDto(LoginRequestSchema) {}
export class EmailTokenDto extends createZodDto(EmailTokenRequestSchema) {}
export class RefreshDto extends createZodDto(RefreshRequestSchema) {}
export class ForgotPasswordDto extends createZodDto(ForgotPasswordRequestSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordRequestSchema) {}
export class UserResponseDto extends createZodDto(UserResponseSchema) {}
export class RefreshResponseDto extends createZodDto(RefreshResponseSchema) {}
