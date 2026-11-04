import { Body, Controller, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { RefreshRequestSchema, type PublicUser, type RefreshResponse, type UserResponse } from '@yoyo/shared';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { AppError } from '../common/app-error';
import { ApiErrors } from '../common/api-errors';
import { parseOptionalBody } from '../common/parse-body';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { clientIp, sessionMeta } from '../common/request-meta';
import { ENV, type Env } from '../config/env';
import {
  EmailTokenDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RefreshResponseDto,
  RegisterDto,
  ResetPasswordDto,
  UserResponseDto,
} from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './cookies';
import { CurrentUser } from './current-user.decorator';
import { toPublicUser } from './public-user';

function refreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE] || undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly limiter: RateLimiter,
    @Inject(ENV) private readonly env: Pick<Env, 'NODE_ENV'>,
  ) {}

  private get secureCookies(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  @Post('register')
  @ZodResponse({ status: 201, type: UserResponseDto, description: 'Account created and signed in (session cookies)' })
  @ApiErrors(400, 403, 409, 429)
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    this.limiter.hit(RATE_LIMITS.register(clientIp(req)));
    const { user, session } = await this.auth.register(body, sessionMeta(req));
    setAuthCookies(res, session, this.secureCookies);
    return { user: toPublicUser(user) };
  }

  @Post('verify-email')
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'Email confirmed' })
  @ApiErrors(400, 403, 410)
  async verifyEmail(@Body() body: EmailTokenDto): Promise<UserResponse> {
    return { user: toPublicUser(await this.auth.verifyEmail(body.token)) };
  }

  @Post('resend-verification')
  @HttpCode(202)
  @UseGuards(AuthGuard)
  @ApiAcceptedResponse({ description: 'A new confirmation link is on its way (none if already confirmed)' })
  @ApiErrors(401, 403, 429)
  async resendVerification(@CurrentUser() user: PublicUser): Promise<void> {
    this.limiter.hit(RATE_LIMITS.resendVerification(user.id));
    await this.auth.resendVerification(user.id);
  }

  @Post('forgot-password')
  @HttpCode(202)
  @ApiAcceptedResponse({ description: 'If the account exists, a reset link is on its way (same answer either way)' })
  @ApiErrors(400, 403, 429)
  async forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request): Promise<void> {
    this.limiter.hit(RATE_LIMITS.forgotPassword(clientIp(req), body.email));
    await this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'Password changed; every session ended' })
  @ApiErrors(400, 403, 410)
  async resetPassword(@Body() body: ResetPasswordDto, @Res({ passthrough: true }) res: Response): Promise<UserResponse> {
    const user = await this.auth.resetPassword(body.token, body.password);
    clearAuthCookies(res, this.secureCookies); // whatever session this browser had is gone now
    return { user: toPublicUser(user) };
  }

  @Post('login')
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'Signed in (session cookies)' })
  @ApiErrors(400, 401, 403, 429)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    this.limiter.hit(RATE_LIMITS.login(clientIp(req), body.email));
    const { user, session } = await this.auth.login(body, sessionMeta(req));
    setAuthCookies(res, session, this.secureCookies);
    return { user: toPublicUser(user) };
  }

  /**
   * Renews the session. The site relies on the yoyo_rt cookie and gets only `{ user }`; apps send
   * `{ refreshToken }` (or a Bearer header) and get the new tokens in the body too.
   */
  @Post('refresh')
  @ApiBody({ type: RefreshDto, required: false })
  @ZodResponse({ status: 200, type: RefreshResponseDto, description: 'New session tokens (cookies; body for apps)' })
  @ApiErrors(400, 401, 403)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<RefreshResponse> {
    const body = parseOptionalBody(RefreshRequestSchema, req.body);
    const presented = body.refreshToken ?? refreshCookie(req);
    try {
      if (!presented) throw new AppError('AUTH_UNAUTHENTICATED', 401);
      const { user, session } = await this.auth.refresh(presented, sessionMeta(req));
      setAuthCookies(res, session, this.secureCookies);
      const forApp = body.refreshToken !== undefined || req.get('authorization') !== undefined;
      return forApp ? { user: toPublicUser(user), ...session } : { user: toPublicUser(user) };
    } catch (error) {
      // A dead session must not linger in the browser; a passing server error must not sign anyone out.
      if (error instanceof AppError) clearAuthCookies(res, this.secureCookies);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBody({ type: RefreshDto, required: false })
  @ApiNoContentResponse({ description: 'This session ended; cookies cleared' })
  @ApiErrors(400, 403)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const body = parseOptionalBody(RefreshRequestSchema, req.body);
    const presented = body.refreshToken ?? refreshCookie(req);
    if (presented) await this.auth.logout(presented);
    clearAuthCookies(res, this.secureCookies);
  }

  @Post('logout-all')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiNoContentResponse({ description: 'Every session of the user ended; cookies cleared' })
  @ApiErrors(401, 403)
  async logoutAll(@CurrentUser() user: PublicUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logoutEverywhere(user.id);
    clearAuthCookies(res, this.secureCookies);
  }
}
