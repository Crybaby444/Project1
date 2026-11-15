import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { AdminAnalyticsController, AnalyticsController } from './analytics.controller';
import { AnalyticsCoreModule } from './analytics-core.module';

@Module({
  imports: [AuthModule, AnalyticsCoreModule],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [RolesGuard],
})
export class AnalyticsModule {}
