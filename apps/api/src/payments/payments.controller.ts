import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CardInputSchema, CardTokenSchema, type CardToken, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider';

class CardInputDto extends createZodDto(CardInputSchema) {}
class CardTokenDto extends createZodDto(CardTokenSchema) {}

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly limiter: RateLimiter,
  ) {}

  /**
   * The payment form's card → a token to pay or be paid with (works 15 minutes). The number is checked
   * and dropped: only the brand and last 4 digits come back.
   */
  @Post('card-tokens')
  @ZodResponse({ status: 201, type: CardTokenDto, description: 'A card token' })
  @ApiErrors(400, 401, 403, 429)
  tokenize(@CurrentUser() user: PublicUser, @Body() card: CardInputDto): CardToken {
    this.limiter.hit(RATE_LIMITS.cardToken(user.id));
    return this.provider.tokenize(card);
  }
}
