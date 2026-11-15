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
import { AdminPeopleService } from './admin-people.service';

@Module({
  imports: [AuthModule, BookingsModule, NotificationsModule, ReviewsModule],
  controllers: [AdminController, AdminAuditController, AdminPeopleController, AdminSearchController],
  providers: [AdminBootstrap, RolesGuard, AdminSettingsService, AdminPeopleService],
})
export class AdminModule {}
