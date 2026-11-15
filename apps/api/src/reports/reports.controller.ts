import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminReportListSchema, AdminReportSchema, AdminReportsQuerySchema, CloseReportSchema, ReportRequestSchema, type AdminReport, type AdminReportList, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { ReportsService } from './reports.service';

class ReportRequestDto extends createZodDto(ReportRequestSchema) {}
class AdminReportsQueryDto extends createZodDto(AdminReportsQuerySchema) {}
class AdminReportListDto extends createZodDto(AdminReportListSchema) {}
class CloseReportDto extends createZodDto(CloseReportSchema) {}
class AdminReportResponseDto extends createZodDto(z.object({ report: AdminReportSchema })) {}

@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly limiter: RateLimiter,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiErrors(400, 401, 404, 409, 429)
  async create(@CurrentUser() user: PublicUser, @Body() body: ReportRequestDto): Promise<void> {
    this.limiter.hit(RATE_LIMITS.report(user.id));
    await this.reports.create(user.id, body);
  }
}

@ApiTags('admin')
@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @ZodResponse({ status: 200, type: AdminReportListDto, description: 'Complaints by status; open ones oldest first' })
  @ApiErrors(400, 401, 403)
  list(@Query() query: AdminReportsQueryDto): Promise<AdminReportList> {
    return this.reports.list(query.status, query.page);
  }

  @Post(':id/close')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminReportResponseDto, description: 'Closes a complaint: acted on it, or nothing to do' })
  @ApiErrors(400, 401, 403, 404, 409)
  async close(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: CloseReportDto): Promise<{ report: AdminReport }> {
    return { report: await this.reports.close(admin.id, id, body) };
  }
}
