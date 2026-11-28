import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BadgesController } from './badges.controller';

@Module({
  imports: [AuthModule, ChatModule, NotificationsModule, BookingsModule],
  controllers: [BadgesController],
})
export class BadgesModule {}
