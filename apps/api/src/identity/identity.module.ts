import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminIdentityController, IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [AuthModule, MailModule, NotificationsModule],
  controllers: [IdentityController, AdminIdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
