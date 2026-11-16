import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { createStorageProvider } from '../media/storage.provider';
import { DEMO_LISTINGS } from './demo/demo-data';
import { demoPhotos } from './demo/demo-images';

/**
 * Example listings for Latvia on the live site (owner, 2026-11-16): one demo owner, every listing marked
 * `demo` (a badge, no booking), four branded pictures each. Idempotent: a title already there is skipped.
 *
 *   DATABASE_URL=… STORAGE=cloudinary CLOUDINARY_URL=… node dist/scripts/demo-listings.js
 *   … node dist/scripts/demo-listings.js --remove      (deletes every demo listing, its photos and the owner)
 */
const DEMO_EMAIL = 'demo@yoyo.rent';

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const storage = createStorageProvider({
    STORAGE: process.env['STORAGE'] as 'local' | 'cloudinary' | undefined,
    CLOUDINARY_URL: process.env['CLOUDINARY_URL'],
    CLOUDINARY_API_URL: 'https://api.cloudinary.com',
    UPLOADS_DIR: process.env['UPLOADS_DIR'] ?? '.uploads',
  });
  try {
    if (process.argv.includes('--remove')) {
      const listings = await prisma.listing.findMany({ where: { demo: true }, include: { photos: true } });
      for (const listing of listings) {
        for (const photo of listing.photos) await storage.delete(photo.storageKey).catch(() => undefined);
        await prisma.listing.delete({ where: { id: listing.id } });
      }
      const owner = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
      if (owner && (await prisma.listing.count({ where: { ownerId: owner.id } })) === 0) await prisma.user.delete({ where: { id: owner.id } });
      console.log(`Removed ${listings.length} demo listings.`);
      return;
    }
    if (!storage.enabled) throw new Error('Storage is off: set STORAGE (and CLOUDINARY_URL)');
    const now = new Date();
    const owner = await prisma.user.upsert({
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
      if (await prisma.listing.findFirst({ where: { demo: true, title: item.title } })) continue;
      const category = await prisma.category.findUnique({ where: { slug: item.category } });
      if (!category) throw new Error(`No category ${item.category}`);
      const photos = [];
      for (const [position, data] of (await demoPhotos(item.pictogram, index)).entries()) {
        const storageKey = crypto.randomUUID();
        photos.push({ storageKey, position, ...(await storage.put(storageKey, data, 'image/jpeg')) });
      }
      // Spread over the last weeks, so the catalog's "new" order looks lived in.
      const published = new Date(now.getTime() - (DEMO_LISTINGS.length - index) * 9 * 3600_000);
      await prisma.listing.create({
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
      console.log(`${index + 1}/${DEMO_LISTINGS.length} ${item.title}`);
    }
    console.log(`Created ${made} demo listings.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
