import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import {
  ADMIN_LISTINGS_PAGE_SIZE,
  AdminListingResponseSchema,
  AdminListingsQuerySchema,
  AdminListingsResponseSchema,
  ApproveListingRequestSchema,
  RejectListingRequestSchema,
  type AdminListingResponse,
  type AdminListingsResponse,
  type PublicUser,
} from '@yoyo/shared';
import type { Request } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { parseOptionalBody } from '../common/parse-body';
import { ModerationService } from './moderation.service';

class AdminListingsQueryDto extends createZodDto(AdminListingsQuerySchema) {}
class AdminListingsResponseDto extends createZodDto(AdminListingsResponseSchema) {}
class AdminListingResponseDto extends createZodDto(AdminListingResponseSchema) {}
class ApproveListingDto extends createZodDto(ApproveListingRequestSchema) {}
class RejectListingDto extends createZodDto(RejectListingRequestSchema) {}

/** Listing moderation (spec §4.8). Administrators only. */
@ApiTags('admin')
@Controller('admin/listings')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  @ZodResponse({ status: 200, type: AdminListingsResponseDto, description: `Listings in a status (review queue by default), oldest first, ${ADMIN_LISTINGS_PAGE_SIZE} a page` })
  @ApiErrors(400, 401, 403)
  async queue(@Query() query: AdminListingsQueryDto): Promise<AdminListingsResponse> {
    return this.moderation.queue(query.status, query.page);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiBody({ type: ApproveListingDto, required: false })
  @ZodResponse({ status: 200, type: AdminListingResponseDto, description: 'Published; the owner gets an email' })
  @ApiErrors(400, 401, 403, 404, 409)
  async approve(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Req() req: Request): Promise<AdminListingResponse> {
    const { version } = parseOptionalBody(ApproveListingRequestSchema, req.body);
    return { listing: await this.moderation.decide(id, admin, { action: 'approve' }, version) };
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminListingResponseDto, description: 'Rejected; the owner sees the reason and gets an email' })
  @ApiErrors(400, 401, 403, 404, 409)
  async reject(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: RejectListingDto): Promise<AdminListingResponse> {
    return { listing: await this.moderation.decide(id, admin, { action: 'reject', reason: body.reason }, body.version) };
  }
}
