import { Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { UserResponse } from '@yoyo/shared';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { clientIp, sessionMeta } from '../common/request-meta';
import { ENV, type Env } from '../config/env';
import { EmailTokenDto, RegisterDto, UserResponseDto } from './auth.dto';
import { AuthService } from './auth.service';
import { setAuthCookies } from './cookies';
import { toPublicUser } from './public-user';

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
}
