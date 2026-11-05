import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { AdminDealsController } from './admin-deals.controller';
import { AdminDealsService } from './admin-deals.service';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [AdminDealsController],
  providers: [AdminDealsService],
})
export class AdminDealsModule {}
