import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListingsModule } from '../listings/listings.module';
import { SmsModule } from '../sms/sms.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { PhoneService } from './phone.service';

@Module({
  imports: [AuthModule, ListingsModule, SmsModule],
  controllers: [MeController],
  providers: [MeService, PhoneService],
})
export class MeModule {}
