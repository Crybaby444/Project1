import type { CategoryNode, OwnerListing } from '@yoyo/shared';
import { apiError, type FakeRoutes } from './fake-api';

/** A listing as its owner sees it; an empty draft unless overridden. */
export function ownerListing(overrides: Partial<OwnerListing> = {}): OwnerListing {
  return {
    id: 'listing-1',
    ownerId: 'user-1',
    status: 'DRAFT',
    categoryId: null,
    title: null,
    description: null,
    condition: null,
    attributes: {},
    dailyCents: null,
    weeklyDiscountPercent: 0,
    depositCents: 0,
    minDays: 1,
    maxDays: 30,
    contentLocale: 'en',
    city: null,
    district: null,
    timeZone: 'Europe/Riga',
    rules: { preset: [], custom: [] },
    photos: [],
    unavailability: [],
    publishedAt: null,
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-04T10:00:00.000Z',
    lat: null,
    lng: null,
    rejectionReason: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedById: null,
    version: 0,
    ...overrides,
  };
}

/** PATCH answers with the body merged into the listing and the version bumped. */
export function echoListing(start: OwnerListing): FakeRoutes {
  let current = start;
  return {
    [`PATCH /api/v1/listings/${start.id}`]: (body) => {
      const { version, ...fields } = body as { version: number } & Record<string, unknown>;
      if (version !== current.version)
        return apiError(409, 'INVALID_STATUS', { details: { currentVersion: current.version } });
      current = { ...current, ...fields, version: current.version + 1 } as OwnerListing;
      return { status: 200, body: { listing: current } };
    },
    [`GET /api/v1/listings/${start.id}`]: () => ({ status: 200, body: { listing: current } }),
  };
}

const names = (en: string, lv: string, ru: string) => ({ en, lv, ru });

/** A small category tree: Electronics → Consoles (model, controllers, games), Tools → Power tools. */
export const testCategories: CategoryNode[] = [
  {
    id: 'cat-electronics',
    slug: 'electronics',
    slugs: { en: 'electronics', lv: 'electronics', ru: 'electronics' },
    sticker: 'blue',
    icon: 'plug',
    names: names('Electronics', 'Elektronika', 'Электроника'),
    attributes: [],
    children: [
      {
        id: 'cat-consoles',
        slug: 'consoles',
        slugs: { en: 'consoles', lv: 'consoles', ru: 'consoles' },
        sticker: 'blue',
        icon: 'gamepad',
        names: names('Game consoles', 'Spēļu konsoles', 'Игровые приставки'),
        attributes: [
          {
            key: 'model',
            type: 'SELECT',
            required: true,
            unit: null,
            labels: names('Model', 'Modelis', 'Модель'),
            options: [
              { value: 'ps5', labels: names('PlayStation 5', 'PlayStation 5', 'PlayStation 5') },
              { value: 'switch', labels: names('Nintendo Switch', 'Nintendo Switch', 'Nintendo Switch') },
            ],
          },
          {
            key: 'controllers',
            type: 'NUMBER',
            required: false,
            unit: null,
            labels: names('Controllers', 'Pultis', 'Геймпады'),
            options: null,
          },
          {
            key: 'games',
            type: 'TEXT',
            required: false,
            unit: null,
            labels: names('Games included', 'Spēles komplektā', 'Игры в комплекте'),
            options: null,
          },
          {
            key: 'vr',
            type: 'BOOLEAN',
            required: false,
            unit: null,
            labels: names('VR headset', 'VR brilles', 'VR-шлем'),
            options: null,
          },
        ],
        children: [],
      },
    ],
  },
  {
    id: 'cat-tools',
    slug: 'tools',
    slugs: { en: 'tools', lv: 'tools', ru: 'tools' },
    sticker: 'sun',
    icon: 'wrench',
    names: names('Tools', 'Instrumenti', 'Инструменты'),
    attributes: [],
    children: [
      {
        id: 'cat-power-tools',
        slug: 'drills-drivers',
        slugs: { en: 'drills-drivers', lv: 'drills-drivers', ru: 'drills-drivers' },
        sticker: 'sun',
        icon: 'drill',
        names: names('Power tools', 'Elektroinstrumenti', 'Электроинструмент'),
        attributes: [
          {
            key: 'power',
            type: 'NUMBER',
            required: true,
            unit: 'W',
            labels: names('Power', 'Jauda', 'Мощность'),
            options: null,
          },
        ],
        children: [],
      },
    ],
  },
];

export const categoriesRoute: FakeRoutes = {
  'GET /api/v1/categories': { status: 200, body: { categories: testCategories } },
};
