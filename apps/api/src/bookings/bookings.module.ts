import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContractService } from '../contracts/contract.service';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../media/storage.module';
import { BookingPhotosService } from './booking-photos.service';
import { DealNotifier } from './deal-notifier';
import { BookingRulesService } from './booking-rules.service';
import { BookingsController, ListingQuoteController, MyBookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { EffectsExecutor } from './effects.executor';

@Module({
  imports: [AuthModule, StorageModule, MailModule],
  controllers: [BookingsController, MyBookingsController, ListingQuoteController],
  providers: [BookingsService, BookingRulesService, EffectsExecutor, BookingPhotosService, ContractService, DealNotifier],
  exports: [BookingsService, BookingRulesService, BookingPhotosService, DealNotifier],
})
export class BookingsModule {}
