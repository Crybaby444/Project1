import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { ListingsController, MyListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuthModule, CategoriesModule],
  controllers: [MyListingsController, ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
