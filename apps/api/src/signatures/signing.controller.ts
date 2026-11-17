import { Body, Controller, Get, HttpCode, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { SigningCheckSchema, SigningStartSchema, type PublicUser, type SigningCheck, type SigningStart } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { SigningService } from './signing.service';

class SigningStartDto extends createZodDto(SigningStartSchema) {}
class SigningCheckDto extends createZodDto(SigningCheckSchema) {}

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(AuthGuard)
export class SigningController {
  constructor(private readonly signing: SigningService) {}

  @Post(':id/signing')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: SigningStartDto, description: 'The signing provider’s page where this person signs the contract' })
  @ApiErrors(401, 404, 409)
  start(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<SigningStart> {
    return this.signing.start(id, user);
  }

  @Get(':id/signing')
  @ZodResponse({ status: 200, type: SigningCheckDto, description: 'Whether the provider confirmed this person’s signature (recorded when it did)' })
  @ApiErrors(401, 404, 409)
  check(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<SigningCheck> {
    return this.signing.check(id, user);
  }
}

/**
 * Dokobit's postbacks (signer_signed / signing_completed). Their body is only a hint: the token names the
 * signing, and SigningService asks Dokobit itself before recording anything.
 */
@ApiExcludeController()
@Controller('signatures/dokobit/postback')
export class DokobitPostbackController {
  private readonly logger = new Logger('DokobitPostback');

  constructor(private readonly signing: SigningService) {}

  @Post()
  @HttpCode(200)
  async postback(@Body() body: unknown): Promise<{ ok: true }> {
    const token = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['token'] : undefined;
    if (typeof token === 'string' && token.length > 0 && token.length < 200) {
      const state = await this.signing.confirm(token);
      this.logger.log(`postback ${token.slice(0, 8)}…: ${state}`);
    }
    return { ok: true };
  }
}
