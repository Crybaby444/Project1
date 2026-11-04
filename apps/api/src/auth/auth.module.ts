import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, AccessTokenService, RefreshTokenService],
  exports: [AuthService, PasswordService, AccessTokenService, RefreshTokenService],
})
export class AuthModule {}
