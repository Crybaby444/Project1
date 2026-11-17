import { PrismaPg } from '@prisma/adapter-pg';
import { addDemoListings, removeDemoListings } from '../demo/demo-listings.service';
import { PrismaClient } from '../generated/prisma/client';
import { createStorageProvider } from '../media/storage.provider';

/**
 * The example listings from a shell (the admin panel has the same as a button: System → Example listings).
 *   DATABASE_URL=… STORAGE=cloudinary CLOUDINARY_URL=… node dist/scripts/demo-listings.js [--remove]
 */
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
    if (process.argv.includes('--remove')) console.log(`Removed ${await removeDemoListings(prisma, storage)} demo listings.`);
    else console.log(`Created ${await addDemoListings(prisma, storage, new Date())} demo listings.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
