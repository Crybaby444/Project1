import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/** The counters alone (no controllers), for the modules that count funnel steps (auth, bookings). */
@Module({ providers: [AnalyticsService], exports: [AnalyticsService] })
export class AnalyticsCoreModule {}
