import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BadgesSchema, type Badges, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BookingsService } from '../bookings/bookings.service';
import { ChatService } from '../chat/chat.service';
import { ApiErrors } from '../common/api-errors';
import { NotificationsService } from '../notifications/notifications.service';

class BadgesDto extends createZodDto(BadgesSchema) {}

/**
 * The header's counts in one request: what the bell, the messages button, the account menu and the tab
 * bar show on every page. The three questions run side by side.
 */
@ApiTags('me')
@Controller('me')
@UseGuards(AuthGuard)
export class BadgesController {
  constructor(
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
    private readonly bookings: BookingsService,
  ) {}

  @Get('badges')
  @ZodResponse({ status: 200, type: BadgesDto, description: 'Unread messages and notifications, and my open deals with those waiting for my step' })
  @ApiErrors(401, 403)
  async badges(@CurrentUser() user: PublicUser): Promise<Badges> {
    const [messages, notifications, deals] = await Promise.all([
      this.chat.unreadCount(user.id, 'direct'),
      this.notifications.unread(user.id),
      this.bookings.summaryMine(user),
    ]);
    return { messages, notifications, deals };
  }
}
