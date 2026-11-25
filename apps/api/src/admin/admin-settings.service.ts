import { Injectable } from '@nestjs/common';
import { DomainError, validateBookingSettings, type BookingSettings } from '@yoyo/domain';
import { SETTING_KEYS, type AdminSettings, type AdminSettingsChange, type PublicUser, type SettingKey } from '@yoyo/shared';
import { AuditService } from '../audit/audit.service';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { fieldValue, SETTING_KEY_OF, storedValue } from '../bookings/booking-settings';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';

const FIELD_OF = Object.fromEntries(Object.entries(SETTING_KEY_OF).map(([field, key]) => [key, field])) as Record<SettingKey, keyof BookingSettings>;
const stored = storedValue;

/** Platform settings for administrators: every deal rule and fee, changed within the rules, logged. */
@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: BookingRulesService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminSettings> {
    const current = await this.rules.settings();
    const defaults = this.rules.defaults();
    return {
      items: SETTING_KEYS.map((key) => {
        const field = FIELD_OF[key];
        const value = stored(field, current[field]) as number | string;
        const fallback = stored(field, defaults[field]) as number | string;
        // "Changed" means it differs from the default (the seed stores every default as a row).
        return { key, value, default: fallback, changed: value !== fallback };
      }),
    };
  }

  async change(admin: PublicUser, change: AdminSettingsChange): Promise<AdminSettings> {
    const current = await this.rules.settings();
    const keys = Object.keys(change) as SettingKey[];
    const next = { ...current } as Record<string, unknown>;
    for (const key of keys) {
      const value = change[key];
      next[FIELD_OF[key]] = fieldValue(FIELD_OF[key], value);
    }
    try {
      validateBookingSettings(next as unknown as BookingSettings);
    } catch (error) {
      if (error instanceof DomainError) throw new AppError('VALIDATION_FAILED', 400, 'These settings do not fit together', { settings: error.code });
      throw error;
    }
    const before = Object.fromEntries(keys.map((key) => [key, stored(FIELD_OF[key], current[FIELD_OF[key]])]));
    await this.prisma.$transaction(keys.map((key) => this.prisma.setting.upsert({ where: { key }, create: { key, value: change[key]! }, update: { value: change[key]! } })));
    await this.audit.record(admin, { action: 'SETTINGS_CHANGED', targetType: 'SETTINGS', summary: keys.join(', '), before, after: change });
    return this.list();
  }
}
