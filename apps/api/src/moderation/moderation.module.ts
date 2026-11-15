import { Module } from '@nestjs/common';
import { SavedSearchesModule } from '../saved-searches/saved-searches.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { RolesGuard } from '../auth/roles.guard';
import { ListingsModule } from '../listings/listings.module';
import { MailModule } from '../mail/mail.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [AuthModule, CategoriesModule, ListingsModule, MailModule, NotificationsModule, SavedSearchesModule],
  controllers: [ModerationController],
  providers: [ModerationService, RolesGuard],
})
export class ModerationModule {}
