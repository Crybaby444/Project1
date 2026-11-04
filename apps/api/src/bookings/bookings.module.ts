import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../media/storage.module';
import { BookingRulesService } from './booking-rules.service';
import { BookingsController, ListingQuoteController, MyBookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { EffectsExecutor } from './effects.executor';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [BookingsController, MyBookingsController, ListingQuoteController],
  providers: [BookingsService, BookingRulesService, EffectsExecutor],
  exports: [BookingsService, BookingRulesService],
})
export class BookingsModule {}
