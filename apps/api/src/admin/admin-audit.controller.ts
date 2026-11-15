import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuditListSchema, AdminAuditQuerySchema, AdminSettingsChangeSchema, AdminSettingsSchema, type AdminAuditList, type AdminSettings, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuditService } from '../audit/audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { AdminSettingsService } from './admin-settings.service';

class AdminAuditQueryDto extends createZodDto(AdminAuditQuerySchema) {}
class AdminAuditListDto extends createZodDto(AdminAuditListSchema) {}
class AdminSettingsDto extends createZodDto(AdminSettingsSchema) {}
class AdminSettingsChangeDto extends createZodDto(AdminSettingsChangeSchema) {}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly settings: AdminSettingsService,
  ) {}

  @Section('audit')
  @Get('audit')
  @ZodResponse({ status: 200, type: AdminAuditListDto, description: 'Every administrator action, newest first' })
  @ApiErrors(400, 401, 403)
  list(@Query() query: AdminAuditQueryDto): Promise<AdminAuditList> {
    return this.audit.list(query);
  }

  @Section('settings')
  @Get('settings')
  @ZodResponse({ status: 200, type: AdminSettingsDto, description: 'Every deal rule and fee, with its default' })
  @ApiErrors(401, 403)
  getSettings(): Promise<AdminSettings> {
    return this.settings.list();
  }

  @Section('settings')
  @Put('settings')
  @ZodResponse({ status: 200, type: AdminSettingsDto, description: 'Changes settings within the deal rules; logged with before and after' })
  @ApiErrors(400, 401, 403)
  setSettings(@CurrentUser() admin: PublicUser, @Body() body: AdminSettingsChangeDto): Promise<AdminSettings> {
    return this.settings.change(admin, body);
  }
}
