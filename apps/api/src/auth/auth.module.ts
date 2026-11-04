import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, GoogleOAuthService, PasswordService, AccessTokenService, RefreshTokenService],
  exports: [AuthService, AuthGuard, PasswordService, AccessTokenService, RefreshTokenService],
})
export class AuthModule {}
