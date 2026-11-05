import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { OffersModule } from '../offers/offers.module';
import { TimersController } from './timers.controller';
import { TimersService } from './timers.service';

@Module({
  imports: [BookingsModule, OffersModule],
  controllers: [TimersController],
  providers: [TimersService],
  exports: [TimersService],
})
export class TimersModule {}
