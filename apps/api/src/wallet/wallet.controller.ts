import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PayoutRequestSchema,
  PayoutResponseSchema,
  TopUpRequestSchema,
  TopUpResponseSchema,
  WalletSummarySchema,
  WalletTransactionsQuerySchema,
  WalletTransactionsResponseSchema,
  type PayoutResponse,
  type PublicUser,
  type TopUpResponse,
  type WalletSummary,
  type WalletTransactionsResponse,
} from '@yoyo/shared';
import type { Request } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { IDEMPOTENCY_HEADER } from '../idempotency/idempotency.interceptor';
import { Idempotent } from '../idempotency/idempotent.decorator';
import { WalletService } from './wallet.service';

class WalletSummaryDto extends createZodDto(WalletSummarySchema) {}
class WalletTransactionsQueryDto extends createZodDto(WalletTransactionsQuerySchema) {}
class WalletTransactionsResponseDto extends createZodDto(WalletTransactionsResponseSchema) {}
class TopUpRequestDto extends createZodDto(TopUpRequestSchema) {}
class TopUpResponseDto extends createZodDto(TopUpResponseSchema) {}
class PayoutRequestDto extends createZodDto(PayoutRequestSchema) {}
class PayoutResponseDto extends createZodDto(PayoutResponseSchema) {}

@ApiTags('wallet')
@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: WalletSummaryDto, description: 'The balance, and what open deals hold' })
  @ApiErrors(401, 403)
  summary(@CurrentUser() user: PublicUser): Promise<WalletSummary> {
    return this.wallet.summary(user.id);
  }

  @Get('transactions')
  @ZodResponse({ status: 200, type: WalletTransactionsResponseDto, description: 'Wallet movements, newest first, 20 a page' })
  @ApiErrors(400, 401, 403)
  history(@CurrentUser() user: PublicUser, @Query() query: WalletTransactionsQueryDto): Promise<WalletTransactionsResponse> {
    return this.wallet.history(user.id, query.page, query.kind);
  }

  @Post('top-ups')
  @Idempotent({ required: true })
  @ZodResponse({ status: 201, type: TopUpResponseDto, description: 'The card was charged and the wallet topped up' })
  @ApiErrors(400, 401, 402, 403, 409, 429)
  topUp(@CurrentUser() user: PublicUser, @Body() body: TopUpRequestDto, @Req() req: Request): Promise<TopUpResponse> {
    this.limiter.hit(RATE_LIMITS.walletMove(user.id, 'top-up'));
    return this.wallet.topUp(user.id, body.amountCents, body.cardToken, req.get(IDEMPOTENCY_HEADER)!);
  }

  @Post('payouts')
  @Idempotent({ required: true })
  @ZodResponse({ status: 201, type: PayoutResponseDto, description: 'Taken from the wallet and sent to the card (status DONE, or PENDING while the provider is slow)' })
  @ApiErrors(400, 401, 403, 409, 429)
  payout(@CurrentUser() user: PublicUser, @Body() body: PayoutRequestDto): Promise<PayoutResponse> {
    this.limiter.hit(RATE_LIMITS.walletMove(user.id, 'payout'));
    return this.wallet.payout(user.id, body.amountCents, body.cardToken);
  }
}
