import { Module } from '@nestjs/common';
import { AnalyticsCoreModule } from '../analytics/analytics-core.module';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { AuthService } from './auth.service';
import { DeviceCookieService } from './device-cookie.service';
import { AppleOAuthService } from './apple-oauth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [MailModule, SmsModule, AnalyticsCoreModule],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, AuthGuard, DeviceCookieService, GoogleOAuthService, AppleOAuthService, PasswordService, AccessTokenService, RefreshTokenService, TwoFactorService],
  exports: [AuthService, TwoFactorService, AuthGuard, PasswordService, AccessTokenService, RefreshTokenService],
})
export class AuthModule {}
