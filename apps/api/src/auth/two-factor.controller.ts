import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwoFactorCodeSchema, TwoFactorSetupSchema, TwoFactorStatusSchema, type PublicUser, type TwoFactorSetup, type TwoFactorStatus } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { TwoFactorService } from './two-factor.service';

class TwoFactorSetupDto extends createZodDto(TwoFactorSetupSchema) {}
class TwoFactorCodeDto extends createZodDto(TwoFactorCodeSchema) {}
class TwoFactorStatusDto extends createZodDto(TwoFactorStatusSchema) {}

/** Two-step sign-in for the signed-in person: is it on, set it up, turn it on with a code, turn it off with a code. */
@ApiTags('me')
@Controller('me/two-factor')
@UseGuards(AuthGuard)
export class TwoFactorController {
  constructor(
    private readonly twoFactor: TwoFactorService,
    private readonly prisma: PrismaService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: TwoFactorStatusDto, description: 'Whether two-step sign-in is on' })
  @ApiErrors(401)
  async status(@CurrentUser() user: PublicUser): Promise<TwoFactorStatus> {
    return { enabled: this.twoFactor.enabled(await this.row(user.id)) };
  }

  @Post('setup')
  @ZodResponse({ status: 200, type: TwoFactorSetupDto, description: 'A new secret for the authenticator app (not on yet)' })
  @ApiErrors(401, 409)
  @HttpCode(200)
  async setup(@CurrentUser() user: PublicUser): Promise<TwoFactorSetup> {
    return this.twoFactor.setup(await this.row(user.id));
  }

  @Post('enable')
  @ZodResponse({ status: 200, type: TwoFactorStatusDto, description: 'On: sign-in now asks for the code' })
  @ApiErrors(400, 401, 409, 429)
  @HttpCode(200)
  async enable(@CurrentUser() user: PublicUser, @Body() body: TwoFactorCodeDto): Promise<TwoFactorStatus> {
    this.limiter.hit(RATE_LIMITS.twoFactorCode(user.id));
    await this.twoFactor.enable(await this.row(user.id), body.code);
    return { enabled: true };
  }

  @Post('disable')
  @ZodResponse({ status: 200, type: TwoFactorStatusDto, description: 'Off' })
  @ApiErrors(400, 401, 429)
  @HttpCode(200)
  async disable(@CurrentUser() user: PublicUser, @Body() body: TwoFactorCodeDto): Promise<TwoFactorStatus> {
    this.limiter.hit(RATE_LIMITS.twoFactorCode(user.id));
    await this.twoFactor.disable(await this.row(user.id), body.code);
    return { enabled: false };
  }

  private row(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }
}
