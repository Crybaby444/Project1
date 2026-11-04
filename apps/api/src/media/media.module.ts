import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListingsModule } from '../listings/listings.module';
import { MediaController, PhotosController } from './media.controller';
import { PhotosService } from './photos.service';
import { StorageModule } from './storage.module';

@Module({
  imports: [AuthModule, ListingsModule, StorageModule],
  controllers: [PhotosController, MediaController],
  providers: [PhotosService],
})
export class MediaModule {}
