import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../media/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { FollowsController, PeopleController, ProfileFollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

@Module({
  imports: [AuthModule, NotificationsModule, ReviewsModule, StorageModule],
  controllers: [PeopleController, ProfileFollowsController, FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
