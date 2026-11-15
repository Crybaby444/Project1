import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmailPreferencesSchema, NotificationListSchema, type EmailPreferences, type NotificationList, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { NotificationsService } from './notifications.service';

class NotificationListDto extends createZodDto(NotificationListSchema) {}
class UnreadDto extends createZodDto(z.object({ count: z.number().int().min(0) })) {}
class EmailPreferencesDto extends createZodDto(EmailPreferencesSchema) {}

@ApiTags('notifications')
@Controller('me')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @ZodResponse({ status: 200, type: NotificationListDto, description: 'My bell: the newest notifications and how many are unread' })
  @ApiErrors(401)
  list(@CurrentUser() user: PublicUser): Promise<NotificationList> {
    return this.notifications.list(user.id);
  }

  @Get('notifications/unread')
  @ZodResponse({ status: 200, type: UnreadDto, description: 'How many notifications I have not read' })
  @ApiErrors(401)
  async unread(@CurrentUser() user: PublicUser): Promise<{ count: number }> {
    return { count: await this.notifications.unread(user.id) };
  }

  @Post('notifications/read')
  @HttpCode(204)
  @ApiErrors(401)
  async readAll(@CurrentUser() user: PublicUser): Promise<void> {
    await this.notifications.readAll(user.id);
  }

  @Post('notifications/:id/read')
  @HttpCode(204)
  @ApiErrors(401, 404)
  async read(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.notifications.read(user.id, id);
  }

  @Get('email-preferences')
  @ZodResponse({ status: 200, type: EmailPreferencesDto, description: 'The email topics I turned off' })
  @ApiErrors(401)
  preferences(@CurrentUser() user: PublicUser): Promise<EmailPreferences> {
    return this.notifications.preferences(user.id);
  }

  @Put('email-preferences')
  @ZodResponse({ status: 200, type: EmailPreferencesDto, description: 'Turns email topics off (account and security mail always goes)' })
  @ApiErrors(400, 401)
  setPreferences(@CurrentUser() user: PublicUser, @Body() body: EmailPreferencesDto): Promise<EmailPreferences> {
    return this.notifications.setPreferences(user.id, body);
  }
}
