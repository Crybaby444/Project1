import { readFile } from 'node:fs/promises';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../../playwright.config';

export const FIXTURES = new URL('../fixtures/', import.meta.url);
export const fixture = (name: string) => new URL(name, FIXTURES).pathname;

export type Category = {
  id: string;
  slug: string;
  attributes: { key: string; type: string; required: boolean; options: { value: string }[] | null }[];
  children: Category[];
};

/** The first leaf of the category tree that has a required SELECT attribute (a console, a power tool…). */
export async function leafCategory(request: APIRequestContext): Promise<Category> {
  const { categories } = (await (await request.get('/api/v1/categories')).json()) as {
    categories: Category[];
  };
  const leaves = categories.flatMap((top) => top.children);
  return leaves.find((leaf) => leaf.attributes.some((a) => a.required && a.type === 'SELECT')) ?? leaves[0]!;
}

/** Required attribute values of a category, filled with the first choice or a plain value. */
export function attributesFor(category: Category): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  for (const attribute of category.attributes.filter((a) => a.required)) {
    if (attribute.type === 'SELECT') values[attribute.key] = attribute.options![0]!.value;
    else if (attribute.type === 'NUMBER') values[attribute.key] = 2;
    else if (attribute.type === 'BOOLEAN') values[attribute.key] = true;
    else values[attribute.key] = 'Charger';
  }
  return values;
}

/** A draft through the site's /api proxy, as the signed-in browser of `request`. */
export async function createListingByApi(request: APIRequestContext, fields: Record<string, unknown> = {}) {
  const res = await request.post('/api/v1/listings', { data: fields });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { listing: { id: string; version: number } }).listing;
}

export async function uploadPhotoByApi(request: APIRequestContext, listingId: string, name = 'item.jpg') {
  const res = await request.post(`/api/v1/listings/${listingId}/photos`, {
    multipart: { file: { name, mimeType: 'image/jpeg', buffer: await readFile(fixture(name)) } },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { photo: { id: string }; version: number };
}

/** A listing with everything review needs (one photo), still a draft. */
export async function readyListingByApi(request: APIRequestContext, title = 'PlayStation 5 for the weekend') {
  const category = await leafCategory(request);
  const listing = await createListingByApi(request, {
    categoryId: category.id,
    title,
    description: 'A PS5 with two controllers and three games, ready for a weekend of play.',
    condition: 'GOOD',
    attributes: attributesFor(category),
    dailyCents: 1500,
    depositCents: 10000,
    city: 'Rīga',
    district: 'Centrs',
    lat: 56.9496,
    lng: 24.1052,
  });
  await uploadPhotoByApi(request, listing.id);
  return { ...listing, category };
}

/** Sends a ready draft to review. */
export async function submitByApi(request: APIRequestContext, listingId: string) {
  const res = await request.post(`/api/v1/listings/${listingId}/submit`);
  expect(res.status(), await res.text()).toBe(200);
}

/** The e2e administrator's sign-in (playwright.config.ts). */
export const E2E_ADMIN_LOGIN = E2E_ADMIN;

/** Signs the browser of `page` in as the e2e administrator (playwright.config.ts). */
export async function signInAsAdmin(page: Page) {
  const res = await page.request.post('/api/v1/auth/login', { data: E2E_ADMIN });
  expect(res.status(), await res.text()).toBe(200);
}

/** Approves a listing as the administrator, in a separate browser context. */
export async function approveByAdmin(adminRequest: APIRequestContext, listingId: string) {
  const { listing } = (await (await adminRequest.get(`/api/v1/listings/${listingId}`)).json()) as {
    listing: { version: number };
  };
  const res = await adminRequest.post(`/api/v1/admin/listings/${listingId}/approve`, {
    data: { version: listing.version },
  });
  expect(res.status(), await res.text()).toBe(200);
}

/** A 1×1 transparent PNG. */
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** Map tiles come from OpenStreetMap's servers; e2e answers them locally so no test depends on them. */
export async function serveBlankMapTiles(page: Page) {
  await page.route(/tile\.openstreetmap\.org/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE }),
  );
}
