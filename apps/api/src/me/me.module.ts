import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListingsModule } from '../listings/listings.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { SmsModule } from '../sms/sms.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { PhoneService } from './phone.service';
import { DataExportService } from './data-export.service';

@Module({
  imports: [AuthModule, ListingsModule, SmsModule, ReviewsModule],
  controllers: [MeController],
  providers: [MeService, PhoneService, DataExportService],
  exports: [MeService],
})
export class MeModule {}
