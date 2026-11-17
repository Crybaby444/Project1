import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

/** Global: every part of the API records what people do (ActivityService.record). */
@Global()
@Module({ imports: [AuthModule], providers: [ActivityService], exports: [ActivityService], controllers: [AdminActivityController] })
export class ActivityCoreModule {}
