import { Injectable, Logger } from '@nestjs/common';
import type { BookingSettings } from '@yoyo/domain';
import { PrismaService } from '../prisma/prisma.service';
import { bookingSettingsFrom, SETTING_KEY_OF } from './booking-settings';

/** The deal rules' settings, read from the `Setting` table on every use (an administrator may change them). */
@Injectable()
export class BookingRulesService {
  private readonly logger = new Logger('BookingRules');

  constructor(private readonly prisma: PrismaService) {}

  async settings(): Promise<BookingSettings> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: Object.values(SETTING_KEY_OF) } } });
    const { settings, invalid } = bookingSettingsFrom(new Map(rows.map((row) => [row.key, row.value])));
    if (invalid.length > 0) this.logger.error(`invalid stored settings ignored, defaults used: ${invalid.join(', ')}`);
    return settings;
  }
}
