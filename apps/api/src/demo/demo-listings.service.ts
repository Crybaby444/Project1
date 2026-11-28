import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { PrismaClient } from '../generated/prisma/client';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_LISTINGS } from './demo-data';
import { demoPhotos } from './demo-images';

export const DEMO_EMAIL = 'demo@yoyo.rent';

type Db = Pick<PrismaClient, 'listing' | 'user' | 'category'>;

/**
 * Example listings for Latvia (owner, 2026-11-16; fifty with real photos since 2026-11-28): one example
 * owner, listings marked `demo` (a badge, never rented), one to two photos each. Idempotent (a title already there is skipped); `remove`
 * deletes every example listing with its photos, and the owner when nothing of theirs is left.
 */
/** At most `limit` new ones a call, so one request stays short (the admin button repeats until done). */
export async function addDemoListings(db: Db, storage: StorageProvider, now: Date, limit = Infinity): Promise<number> {
  if (!storage.enabled) throw new AppError('STORAGE_DISABLED', 503);
  const owner = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: 'Yoyo Example',
      username: 'yoyo.example',
      locale: 'lv',
      about: 'Example listings that show how Yoyo works. They cannot be rented.',
      city: 'Rīga',
      emailVerifiedAt: now,
      identityVerifiedAt: now,
      adultConfirmedAt: now,
      dataConsentAt: now,
      createdAt: now,
    },
  });
  let made = 0;
  for (const [index, item] of DEMO_LISTINGS.entries()) {
    if (made >= limit) break;
    if (await db.listing.findFirst({ where: { demo: true, title: item.title } })) continue;
    const category = await db.category.findUnique({ where: { slug: item.category } });
    if (!category) continue;
    const photos = [];
    for (const [position, data] of (await demoPhotos(item.photos)).entries()) {
      const storageKey = crypto.randomUUID();
      photos.push({ storageKey, position, ...(await storage.put(storageKey, data, 'image/jpeg')) });
    }
    // Spread over the last days, so the catalog's "new" order looks lived in.
    const published = new Date(now.getTime() - (DEMO_LISTINGS.length - index) * 9 * 3600_000);
    await db.listing.create({
      data: {
        ownerId: owner.id,
        categoryId: category.id,
        status: 'PUBLISHED',
        demo: true,
        title: item.title,
        description: item.description,
        condition: item.condition,
        attributes: item.attributes,
        dailyCents: item.daily * 100,
        weeklyDiscountPercent: item.weeklyDiscount,
        depositCents: item.deposit * 100,
        minDays: item.minDays,
        maxDays: item.maxDays,
        city: item.city,
        district: item.district,
        country: 'LV',
        lat: item.lat,
        lng: item.lng,
        timeZone: 'Europe/Riga',
        contentLocale: item.locale,
        rules: { preset: item.rules, custom: item.custom ?? [] },
        submittedAt: published,
        reviewedAt: published,
        publishedAt: published,
        createdAt: published,
        photos: { create: photos },
      },
    });
    made += 1;
  }
  return made;
}

export async function removeDemoListings(db: Db, storage: StorageProvider): Promise<number> {
  const listings = await db.listing.findMany({ where: { demo: true }, include: { photos: true } });
  for (const listing of listings) {
    for (const photo of listing.photos) await storage.delete(photo.storageKey).catch(() => undefined);
    await db.listing.delete({ where: { id: listing.id } });
  }
  const owner = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (owner && (await db.listing.count({ where: { ownerId: owner.id } })) === 0) await db.user.delete({ where: { id: owner.id } });
  return listings.length;
}

@Injectable()
export class DemoListingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async status(): Promise<{ count: number; total: number }> {
    return { count: await this.prisma.listing.count({ where: { demo: true } }), total: DEMO_LISTINGS.length };
  }

  /** Six at a time: a few seconds a call even on the free hosting plan. */
  add(): Promise<number> {
    return addDemoListings(this.prisma, this.storage, this.clock.now(), 6);
  }

  remove(): Promise<number> {
    return removeDemoListings(this.prisma, this.storage);
  }
}
