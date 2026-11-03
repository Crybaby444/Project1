import { Injectable } from '@nestjs/common';
import { SETTING_DEFAULTS, type SettingKey } from '@yoyo/shared';
import { PrismaService } from '../prisma/prisma.service.js';

type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K] extends number ? number : never;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Reads a setting; falls back to the default when no row exists. */
  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return (row?.value ?? SETTING_DEFAULTS[key]) as SettingValue<K>;
  }

  async set<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
