import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { AdminBootstrap } from './admin-bootstrap';
import { AdminController } from './admin.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminSettingsService } from './admin-settings.service';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminPeopleController } from './admin-people.controller';
import { AdminSearchController } from './admin-search';
import { AdminSystemController } from './admin-system.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminStaffController } from './admin-staff.controller';
import { MeModule } from '../me/me.module';
import { AdminUsersCrudController } from './admin-users-crud.controller';
import { MailModule } from '../mail/mail.module';
import { AdminPeopleService } from './admin-people.service';

@Module({
  imports: [AuthModule, BookingsModule, NotificationsModule, ReviewsModule, MailModule, MeModule],
  controllers: [AdminController, AdminAuditController, AdminPeopleController, AdminSearchController, AdminSystemController, AdminCategoriesController, AdminStaffController, AdminUsersCrudController],
  providers: [AdminBootstrap, RolesGuard, AdminSettingsService, AdminPeopleService],
})
export class AdminModule {}
