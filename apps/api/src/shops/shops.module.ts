import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../media/storage.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { MyShopsController, ShopsPublicController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [AuthModule, ReviewsModule, StorageModule],
  controllers: [ShopsPublicController, MyShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
