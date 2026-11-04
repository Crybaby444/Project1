import request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';
import type { Listing, ListingStatus, Prisma, User } from '../../src/generated/prisma/client';
import type { TestApp } from './test-app';
import { seedUser, type SeedUser } from './users';

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** Requests as one signed-in user, the way the apps call the API (Bearer token, no cookies). */
export interface Client {
  user: User;
  email: string;
  token: string;
  get(path: string): request.Test;
  post(path: string): request.Test;
  patch(path: string): request.Test;
  put(path: string): request.Test;
  delete(path: string): request.Test;
}

/** A new user with a live session (no login request, so login limits never get in the way). */
export async function signedInClient(t: TestApp, seed: SeedUser = {}): Promise<Client> {
  const { user, email } = await seedUser(t, { emailVerified: true, ...seed });
  const { accessToken } = await t.app.get(AuthService).startSession(user, {});
  const call = (method: Method) => (path: string) =>
    request(t.server)[method](`/api/v1${path}`).set('Authorization', `Bearer ${accessToken}`);
  return {
    user,
    email,
    token: accessToken,
    get: call('get'),
    post: call('post'),
    patch: call('patch'),
    put: call('put'),
    delete: call('delete'),
  };
}

export async function categoryId(t: TestApp, slug: string): Promise<string> {
  return (await t.prisma.category.findUniqueOrThrow({ where: { slug } })).id;
}

/** Everything a listing needs to go to review, in the power-tools category. */
export async function completeListingData(t: TestApp): Promise<Prisma.ListingUncheckedCreateInput> {
  return {
    ownerId: '',
    categoryId: await categoryId(t, 'power-tools'),
    title: 'Bosch cordless drill',
    description: 'A strong cordless drill for concrete and wood, with two batteries.',
    condition: 'GOOD',
    attributes: { power: 'battery', watts: 750 },
    dailyCents: 1500,
    weeklyDiscountPercent: 10,
    depositCents: 5000,
    minDays: 1,
    maxDays: 14,
    city: 'Rīga',
    district: 'Centrs',
    lat: 56.949651,
    lng: 24.10519,
  };
}

/**
 * Puts a complete listing of `owner` straight into the database, with one photo record (its file is
 * not stored anywhere). `status` defaults to DRAFT.
 */
export async function seedListing(
  t: TestApp,
  owner: { id: string },
  overrides: Partial<Prisma.ListingUncheckedCreateInput> & { status?: ListingStatus; photos?: number } = {},
): Promise<Listing> {
  const { photos = 1, ...rest } = overrides;
  const now = t.clock.now();
  const live = rest.status !== undefined && rest.status !== 'DRAFT';
  return t.prisma.listing.create({
    data: {
      ...(await completeListingData(t)),
      ...(live && { submittedAt: now }),
      ...((rest.status === 'PUBLISHED' || rest.status === 'HIDDEN') && { publishedAt: now, reviewedAt: now }),
      ...rest,
      ownerId: owner.id,
      photos: {
        create: Array.from({ length: photos }, (_, position) => ({
          storageKey: `seed-${crypto.randomUUID()}`,
          width: 800,
          height: 600,
          bytes: 1000,
          format: 'webp',
          position,
        })),
      },
    },
  });
}

/** Empties the listing tables (photos, dates and the rest go with their listings). */
export async function resetListings(t: TestApp): Promise<void> {
  await t.prisma.$executeRawUnsafe('TRUNCATE TABLE "Listing" CASCADE');
}
