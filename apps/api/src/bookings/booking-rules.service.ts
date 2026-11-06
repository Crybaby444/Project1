import { Inject, Injectable, Logger } from '@nestjs/common';
import { validateBookingSettings, type BookingSettings } from '@yoyo/domain';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { bookingSettingsFrom, feeSettingsFromEnv, SETTING_KEY_OF } from './booking-settings';

/**
 * The deal rules' settings: the domain defaults, the fee from the environment (FEE_*), and over both the
 * `Setting` table, read on every use (an administrator may change them).
 */
@Injectable()
export class BookingRulesService {
  private readonly logger = new Logger('BookingRules');

  private readonly base: BookingSettings;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) env: Env,
  ) {
    this.base = feeSettingsFromEnv(env);
    validateBookingSettings(this.base);
  }

  async settings(): Promise<BookingSettings> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: Object.values(SETTING_KEY_OF) } } });
    const { settings, invalid } = bookingSettingsFrom(new Map(rows.map((row) => [row.key, row.value])), this.base);
    if (invalid.length > 0) this.logger.error(`invalid stored settings ignored, defaults used: ${invalid.join(', ')}`);
    return settings;
  }
}
