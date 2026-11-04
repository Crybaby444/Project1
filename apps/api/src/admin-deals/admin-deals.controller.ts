import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AdminAccountsQuerySchema,
  AdminAccountsResponseSchema,
  AdminBookingDetailSchema,
  AdminBookingsQuerySchema,
  AdminBookingsResponseSchema,
  AdminLedgerQuerySchema,
  AdminLedgerResponseSchema,
  BookingResponseSchema,
  LedgerSummarySchema,
  ResolveRequestSchema,
  type AdminAccountsResponse,
  type AdminBookingDetail,
  type AdminBookingsResponse,
  type AdminLedgerResponse,
  type BookingResponse,
  type LedgerSummary,
  type PublicUser,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { Idempotent } from '../idempotency/idempotent.decorator';
import { BookingsService } from '../bookings/bookings.service';
import { AdminDealsService } from './admin-deals.service';

class AdminBookingsQueryDto extends createZodDto(AdminBookingsQuerySchema) {}
class AdminBookingsResponseDto extends createZodDto(AdminBookingsResponseSchema) {}
class AdminBookingDetailDto extends createZodDto(AdminBookingDetailSchema) {}
class AdminLedgerQueryDto extends createZodDto(AdminLedgerQuerySchema) {}
class AdminLedgerResponseDto extends createZodDto(AdminLedgerResponseSchema) {}
class AdminAccountsQueryDto extends createZodDto(AdminAccountsQuerySchema) {}
class AdminAccountsResponseDto extends createZodDto(AdminAccountsResponseSchema) {}
class LedgerSummaryDto extends createZodDto(LedgerSummarySchema) {}
class ResolveRequestDto extends createZodDto(ResolveRequestSchema) {}
class BookingResponseDto extends createZodDto(BookingResponseSchema) {}

/** Deals and money for administrators: read everything, decide disputes. */
@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminDealsController {
  constructor(
    private readonly deals: AdminDealsService,
    private readonly bookings: BookingsService,
  ) {}

  @Get('bookings')
  @ZodResponse({ status: 200, type: AdminBookingsResponseDto, description: 'Deals, 50 a page; `disputed=true` for the dispute queue' })
  @ApiErrors(400, 401, 403)
  list(@CurrentUser() admin: PublicUser, @Query() query: AdminBookingsQueryDto): Promise<AdminBookingsResponse> {
    return this.deals.list(admin, query);
  }

  @Get('bookings/:id')
  @ZodResponse({ status: 200, type: AdminBookingDetailDto, description: 'A deal with its journal, ledger operations, card payments and photos' })
  @ApiErrors(401, 403, 404)
  detail(@CurrentUser() admin: PublicUser, @Param('id') id: string): Promise<AdminBookingDetail> {
    return this.deals.detail(admin, id);
  }

  @Post('bookings/:id/resolve')
  @HttpCode(200)
  @Idempotent({ required: true })
  @ZodResponse({ status: 200, type: BookingResponseDto, description: 'The dispute is decided; both sides are told' })
  @ApiErrors(400, 401, 403, 404, 409)
  async resolve(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: ResolveRequestDto): Promise<BookingResponse> {
    return { booking: await this.bookings.resolve(id, admin, body.version, body.decision, body.comment) };
  }

  @Get('ledger/operations')
  @ZodResponse({ status: 200, type: AdminLedgerResponseDto, description: 'Ledger operations with their postings, newest first' })
  @ApiErrors(400, 401, 403)
  operations(@Query() query: AdminLedgerQueryDto): Promise<AdminLedgerResponse> {
    return this.deals.operations(query);
  }

  @Get('ledger/accounts')
  @ZodResponse({ status: 200, type: AdminAccountsResponseDto, description: 'Account balances' })
  @ApiErrors(400, 401, 403)
  accounts(@Query() query: AdminAccountsQueryDto): Promise<AdminAccountsResponse> {
    return this.deals.accounts(query);
  }

  @Get('ledger/summary')
  @ZodResponse({ status: 200, type: LedgerSummaryDto, description: 'Totals by kind of account and a check of the whole journal' })
  @ApiErrors(401, 403)
  summary(): Promise<LedgerSummary> {
    return this.deals.summary();
  }
}
