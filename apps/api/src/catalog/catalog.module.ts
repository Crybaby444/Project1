import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { CategoriesModule } from '../categories/categories.module';
import { StorageModule } from '../media/storage.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CatalogController, ProfilesController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [BookingsModule, CategoriesModule, StorageModule, ReviewsModule],
  controllers: [CatalogController, ProfilesController],
  providers: [CatalogService, ProfilesService],
  exports: [CatalogService],
})
export class CatalogModule {}
