import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { OffersModule } from '../offers/offers.module';
import { RemindersService } from './reminders.service';
import { TimersController } from './timers.controller';
import { TimersService } from './timers.service';

@Module({
  imports: [BookingsModule, OffersModule],
  controllers: [TimersController],
  providers: [TimersService, RemindersService],
  exports: [TimersService],
})
export class TimersModule {}
