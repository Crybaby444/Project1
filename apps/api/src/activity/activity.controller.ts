import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActivityPageSchema, ActivityQuerySchema, type ActivityPage } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { ActivityService } from './activity.service';

class ActivityQueryDto extends createZodDto(ActivityQuerySchema) {}
class ActivityPageDto extends createZodDto(ActivityPageSchema) {}

/** Admin → Activity: everything people do, newest first, filtered by group, kind or person. */
@ApiTags('admin')
@Controller('admin/activity')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Section('activity')
export class AdminActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  @ZodResponse({ status: 200, type: ActivityPageDto, description: 'Activity, newest first; `next` pages back' })
  @ApiErrors(400, 401, 403)
  list(@Query() query: ActivityQueryDto): Promise<ActivityPage> {
    return this.activity.list(query);
  }
}
