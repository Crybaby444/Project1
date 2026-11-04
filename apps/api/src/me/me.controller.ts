import { Body, Controller, Delete, Get, HttpCode, Inject, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBody, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { DeleteAccountRequestSchema, type PublicUser, type RefreshResponse, type UserResponse } from '@yoyo/shared';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { RefreshResponseDto, UserResponseDto } from '../auth/auth.dto';
import { AuthGuard } from '../auth/auth.guard';
import { clearAuthCookies, setAuthCookies } from '../auth/cookies';
import { CurrentUser } from '../auth/current-user.decorator';
import { toPublicUser } from '../auth/public-user';
import { ApiErrors } from '../common/api-errors';
import { parseOptionalBody } from '../common/parse-body';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { sessionMeta } from '../common/request-meta';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, DeleteAccountDto, PhoneDto, PhoneVerifyDto, UpdateProfileDto } from './me.dto';
import { MeService } from './me.service';
import { PhoneService } from './phone.service';

@ApiTags('me')
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly phone: PhoneService,
    private readonly prisma: PrismaService,
    private readonly limiter: RateLimiter,
    @Inject(ENV) private readonly env: Pick<Env, 'NODE_ENV'>,
  ) {}

  private get secureCookies(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  @Get()
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'The signed-in user' })
  @ApiErrors(401, 403)
  get(@CurrentUser() user: PublicUser): UserResponse {
    return { user };
  }

  @Patch()
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'Profile updated' })
  @ApiErrors(400, 401, 403)
  async update(@CurrentUser() user: PublicUser, @Body() body: UpdateProfileDto): Promise<UserResponse> {
    return { user: toPublicUser(await this.me.updateProfile(user.id, body)) };
  }

  /** Every other session ends; this device gets a fresh one (cookies, and tokens in the body for apps). */
  @Post('password')
  @ZodResponse({ status: 200, type: RefreshResponseDto, description: 'Password changed; other sessions ended' })
  @ApiErrors(400, 401, 403)
  async changePassword(
    @CurrentUser() user: PublicUser,
    @Body() body: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    const changed = await this.me.changePassword(user.id, body.currentPassword, body.newPassword, sessionMeta(req));
    setAuthCookies(res, changed.session, this.secureCookies);
    const forApp = req.get('authorization') !== undefined;
    return forApp ? { user: toPublicUser(changed.user), ...changed.session } : { user: toPublicUser(changed.user) };
  }

  @Delete()
  @HttpCode(204)
  @ApiBody({ type: DeleteAccountDto, required: false })
  @ApiNoContentResponse({ description: 'Account deleted; every session ended; cookies cleared' })
  @ApiErrors(400, 401, 403)
  async delete(@CurrentUser() user: PublicUser, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const body = parseOptionalBody(DeleteAccountRequestSchema, req.body);
    await this.me.deleteAccount(user.id, body.password);
    clearAuthCookies(res, this.secureCookies);
  }

  @Post('phone')
  @HttpCode(202)
  @ApiAcceptedResponse({ description: 'A 6-digit code is on its way (valid 10 minutes)' })
  @ApiErrors(400, 401, 403, 404, 429)
  async requestPhoneCode(@CurrentUser() user: PublicUser, @Body() body: PhoneDto): Promise<void> {
    this.phone.assertEnabled(); // 404 before the attempt is counted
    this.limiter.hit(RATE_LIMITS.phoneCode(user.id));
    await this.phone.sendCode(await this.userRow(user.id), body.phone);
  }

  @Post('phone/verify')
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'Phone confirmed' })
  @ApiErrors(400, 401, 403, 404, 410)
  async verifyPhone(@CurrentUser() user: PublicUser, @Body() body: PhoneVerifyDto): Promise<UserResponse> {
    return { user: toPublicUser(await this.phone.verify(user.id, body.code)) };
  }

  private userRow(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }
}
