import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminNoteRequestSchema, AdminReasonSchema, AdminUserDetailSchema, type AdminUserDetail, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { AdminPeopleService } from './admin-people.service';

class AdminUserDetailDto extends createZodDto(AdminUserDetailSchema) {}
class AdminNoteRequestDto extends createZodDto(AdminNoteRequestSchema) {}
class AdminReasonDto extends createZodDto(AdminReasonSchema) {}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPeopleController {
  constructor(private readonly people: AdminPeopleService) {}

  @Get('users/:id')
  @ZodResponse({ status: 200, type: AdminUserDetailDto, description: 'A person in full: items, deals, reviews, complaints, notes' })
  @ApiErrors(401, 403, 404)
  detail(@Param('id') id: string): Promise<AdminUserDetail> {
    return this.people.detail(id);
  }

  @Post('users/:id/notes')
  @HttpCode(201)
  @ApiErrors(400, 401, 403, 404)
  async note(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: AdminNoteRequestDto): Promise<void> {
    await this.people.addNote(admin, id, body.text);
  }

  @Post('listings/:id/takedown')
  @HttpCode(200)
  @ApiErrors(400, 401, 403, 404, 409)
  async takedown(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: AdminReasonDto): Promise<void> {
    await this.people.takedown(admin, id, body.reason);
  }

  @Post('reviews/:id/hide')
  @HttpCode(200)
  @ApiErrors(400, 401, 403, 404)
  async hideReview(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: AdminReasonDto): Promise<void> {
    await this.people.setReviewHidden(admin, id, body.reason);
  }

  @Post('reviews/:id/show')
  @HttpCode(200)
  @ApiErrors(401, 403, 404)
  async showReview(@CurrentUser() admin: PublicUser, @Param('id') id: string): Promise<void> {
    await this.people.setReviewHidden(admin, id, null);
  }
}
