import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { AdminBootstrap } from './admin-bootstrap';
import { AdminController } from './admin.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminSettingsService } from './admin-settings.service';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [AdminController, AdminAuditController],
  providers: [AdminBootstrap, RolesGuard, AdminSettingsService],
})
export class AdminModule {}
