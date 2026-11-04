import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiFoundResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import {
  RefreshRequestSchema,
  type ProvidersResponse,
  type PublicUser,
  type RefreshResponse,
  type UserResponse,
} from '@yoyo/shared';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { AppError } from '../common/app-error';
import { ApiErrors } from '../common/api-errors';
import { parseOptionalBody } from '../common/parse-body';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { clientIp, sessionMeta } from '../common/request-meta';
import { ENV, type Env } from '../config/env';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms.provider';
import {
  EmailTokenDto,
  ForgotPasswordDto,
  GoogleCallbackQueryDto,
  GoogleStartQueryDto,
  LoginDto,
  ProvidersResponseDto,
  RefreshDto,
  RefreshResponseDto,
  RegisterDto,
  ResetPasswordDto,
  UserResponseDto,
} from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService, localeFromPath } from './auth.service';
import { clearAuthCookies, DEVICE_COOKIE, REFRESH_COOKIE, setAuthCookies, setDeviceCookie } from './cookies';
import { DeviceCookieService, type Device } from './device-cookie.service';
import {
  GoogleOAuthService,
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  OAUTH_STATE_TTL_SECONDS,
  safeReturnTo,
} from './google-oauth.service';
import { CurrentUser } from './current-user.decorator';
import { toPublicUser } from './public-user';

function readCookie(req: Request, name: string): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[name] || undefined;
}

const refreshCookie = (req: Request) => readCookie(req, REFRESH_COOKIE);
const googleDisabled = () => new AppError('AUTH_PROVIDER_DISABLED', 404, 'Sign-in with Google is not available');

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    private readonly limiter: RateLimiter,
    private readonly devices: DeviceCookieService,
    @Inject(ENV) private readonly env: Pick<Env, 'NODE_ENV' | 'WEB_ORIGIN' | 'REGISTRATION_HOURLY_CAP'>,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider | null,
  ) {}

  private get secureCookies(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  /** The device cookie this browser sent, if it is valid and belongs to the account with `email`. */
  private async knownDevice(req: Request, email: string): Promise<Device | null> {
    const device = await this.devices.read(readCookie(req, DEVICE_COOKIE));
    if (!device) return null;
    return (await this.auth.accountIdFor(email)) === device.userId ? device : null;
  }

  /** (Re)sets the device cookie after a successful sign-in, keeping the device id of this account. */
  private async rememberDevice(req: Request, res: Response, userId: string): Promise<void> {
    const previous = await this.devices.read(readCookie(req, DEVICE_COOKIE));
    const deviceId = previous?.userId === userId ? previous.deviceId : undefined;
    setDeviceCookie(res, await this.devices.issue(userId, deviceId), this.secureCookies);
  }

  @Get('providers')
  @ZodResponse({ status: 200, type: ProvidersResponseDto, description: 'Sign-in methods this deployment offers' })
  providers(): ProvidersResponse {
    return { google: this.google.enabled, phone: this.sms !== null };
  }

  @Get('google')
  @ApiFoundResponse({ description: 'Redirect to Google’s consent screen' })
  @ApiErrors(400, 404)
  async googleStart(@Query() query: GoogleStartQueryDto, @Res() res: Response): Promise<void> {
    if (!this.google.enabled) throw googleDisabled();
    const { url, cookie } = await this.google.start(safeReturnTo(query.returnTo));
    res.cookie(OAUTH_COOKIE, cookie, {
      httpOnly: true,
      sameSite: 'lax', // sent on Google's top-level redirect back to us
      secure: this.secureCookies,
      path: OAUTH_COOKIE_PATH,
      maxAge: OAUTH_STATE_TTL_SECONDS * 1000,
    });
    res.redirect(302, url);
  }

  /** Google sends the browser back here (through the site's /api proxy) with `code` and `state`. */
  @Get('google/callback')
  @ApiFoundResponse({ description: 'Signed in (session cookies); redirect to the page the user started from' })
  @ApiErrors(400, 401, 403, 404)
  async googleCallback(
    @Query() query: GoogleCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.google.enabled) throw googleDisabled();
    // One attempt, one use: the cookie goes whatever happens next.
    res.cookie(OAUTH_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: this.secureCookies, path: OAUTH_COOKIE_PATH, maxAge: 0 });
    const attempt = await this.google.readAttempt(readCookie(req, OAUTH_COOKIE), query.state);
    const back = `${this.env.WEB_ORIGIN}${attempt.returnTo}`;
    if (query.error) {
      res.redirect(302, back); // cancelled on Google's screen: back where the user started, still signed out
      return;
    }
    if (!query.code) throw new AppError('VALIDATION_FAILED', 400, 'Google sent no code', { code: 'Missing' });

    const identity = await this.google.identify(query.code, attempt);
    const user = await this.auth.signInWithGoogle(identity, localeFromPath(attempt.returnTo));
    setAuthCookies(res, await this.auth.startSession(user, sessionMeta(req)), this.secureCookies);
    res.redirect(302, back);
  }

  @Post('register')
  @ZodResponse({ status: 201, type: UserResponseDto, description: 'Account created and signed in (session cookies)' })
  @ApiErrors(400, 403, 409, 429)
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    this.limiter.hit(RATE_LIMITS.register(clientIp(req), this.env.REGISTRATION_HOURLY_CAP));
    const { user, session } = await this.auth.register(body, sessionMeta(req));
    setAuthCookies(res, session, this.secureCookies);
    await this.rememberDevice(req, res, user.id);
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
    const device = await this.knownDevice(req, body.email);
    this.limiter.hit(
      device
        ? RATE_LIMITS.loginFromDevice(clientIp(req), body.email, device.deviceId)
        : RATE_LIMITS.login(clientIp(req), body.email),
    );
    const { user, session } = await this.auth.login(body, sessionMeta(req));
    setAuthCookies(res, session, this.secureCookies);
    await this.rememberDevice(req, res, user.id);
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
