import { expect, type APIRequestContext, type Browser } from '@playwright/test';
import { asOwnVisitor, registerByApi } from './accounts';
import { approveByAdmin, attributesFor, createListingByApi, E2E_ADMIN_LOGIN, uploadPhotoByApi, type Category } from './listings';

type Tree = { categories: (Category & { slugs: Record<string, string> })[] };

/** A category by its slug anywhere in the tree. */
export async function categoryBySlug(request: APIRequestContext, slug: string) {
  const { categories } = (await (await request.get('/api/v1/categories')).json()) as Tree;
  const all = categories.flatMap((root) => [root, ...(root.children as Tree['categories'])]);
  const found = all.find((category) => category.slug === slug);
  if (!found) throw new Error(`no category ${slug}`);
  return found;
}

let admin: Promise<APIRequestContext> | null = null;

/**
 * The administrator, signed in once per worker (sign-ins to one account are rate limited, and every
 * published listing needs an approval).
 */
function adminRequest(browser: Browser): Promise<APIRequestContext> {
  admin ??= (async () => {
    const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
    await asOwnVisitor(context);
    const login = await context.request.post('/api/v1/auth/login', { data: E2E_ADMIN_LOGIN });
    expect(login.status(), await login.text()).toBe(200);
    return context.request;
  })();
  return admin;
}

/** A word nobody else's listing has, so a search finds only this test's items. */
export const uniqueWord = (tag: string) => `${tag}${Date.now().toString(36)}${Math.round(Math.random() * 1e6).toString(36)}`;

export type Published = { id: string; title: string; slug: string; ownerId: string; ownerRequest: APIRequestContext };

/**
 * Publishes a listing the whole way (owner drafts, uploads a photo, submits; the administrator
 * approves), each side in its own browser context. Returns the owner's request for later changes.
 */
export async function publishListing(
  browser: Browser,
  { title, categorySlug = 'drills-drivers', fields = {}, owner }: { title: string; categorySlug?: string; fields?: Record<string, unknown>; owner?: { request: APIRequestContext; id: string } },
): Promise<Published> {
  let ownerRequest = owner?.request;
  let ownerId = owner?.id;
  if (!ownerRequest) {
    const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
    await asOwnVisitor(context);
    ownerRequest = context.request;
    await registerByApi(ownerRequest, { name: 'Jānis Ozols', locale: 'lv' });
    ownerId = ((await (await ownerRequest.get('/api/v1/me')).json()) as { user: { id: string } }).user.id;
  }
  const category = await categoryBySlug(ownerRequest, categorySlug);
  const listing = await createListingByApi(ownerRequest, {
    categoryId: category.id,
    title,
    description: 'Strong and light, with two batteries and a case. Charged before every rental.',
    condition: 'GOOD',
    attributes: attributesFor(category),
    dailyCents: 1500,
    weeklyDiscountPercent: 10,
    depositCents: 5000,
    minDays: 1,
    maxDays: 30,
    city: 'Rīga',
    district: 'Centrs',
    lat: 56.9496,
    lng: 24.1052,
    ...fields,
  });
  await uploadPhotoByApi(ownerRequest, listing.id);
  const submitted = await ownerRequest.post(`/api/v1/listings/${listing.id}/submit`);
  expect(submitted.status(), await submitted.text()).toBe(200);

  await approveByAdmin(await adminRequest(browser), listing.id);

  const address = (await (await ownerRequest.get(`/api/v1/catalog/listings/${listing.id}/address`)).json()) as { slug: string };
  return { id: listing.id, title, slug: address.slug, ownerId: ownerId!, ownerRequest };
}
