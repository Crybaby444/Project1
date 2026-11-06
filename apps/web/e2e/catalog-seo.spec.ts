import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor } from './support/accounts';
import { publishListing, uniqueWord, type Published } from './support/catalog';

/** Search engines are pointed at the live site (SITE_ORIGIN is not set in e2e). */
const SITE = 'https://yoyo.rent';

const robots = (page: Page) => page.locator('meta[name="robots"]').getAttribute('content');
const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute('href');
const hreflangs = (page: Page) => page.locator('link[rel="alternate"][hreflang]').count();

let latvian: Published;
let projector: Published[];

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

test.beforeAll(async ({ browser }) => {
  latvian = await publishListing(browser, { title: `Spēļu konsole ${uniqueWord('ps')}`, fields: { contentLocale: 'lv' } });
  // Three items make a category indexable (owner's rule); projectors are only filled here.
  projector = [];
  for (let i = 0; i < 3; i++) projector.push(await publishListing(browser, { title: `Projector ${uniqueWord('beam')}`, categorySlug: 'projectors' }));
});

test.describe('item pages', () => {
  test('under every language: canonical in the item’s own language, no hreflang, html lang and JSON-LD to match', async ({ page }) => {
    const path = `/listings/${latvian.id}-${latvian.slug}`;
    for (const prefix of ['', '/lv', '/ru']) {
      const response = await page.goto(`${prefix}${path}`);
      expect(response?.status()).toBe(200);
      expect(await canonical(page)).toBe(`${SITE}/lv${path}`);
      expect(await hreflangs(page)).toBe(0);
      // next-intl's language alternates are taken off the response for item pages (W02 §F).
      expect(response?.headers()['link'] ?? '').not.toContain('hreflang');
      await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
      expect(await robots(page)).toBe('index, follow');
      const product = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
      expect(product).toMatchObject({ '@type': 'Product', name: latvian.title, url: `${SITE}/lv${path}` });
      expect(product.offers).toMatchObject({ '@type': 'Offer', priceCurrency: 'EUR', price: '15.00' });
    }
  });

  test('a wrong or missing slug moves permanently to the right address, in the same language', async ({ request }) => {
    const right = `/ru/listings/${latvian.id}-${latvian.slug}`;
    for (const wrong of [`/ru/listings/${latvian.id}-old-title`, `/ru/listings/${latvian.id}`]) {
      const response = await request.get(wrong, { maxRedirects: 0 });
      expect(response.status(), wrong).toBe(301);
      expect(new URL(response.headers()['location']!, 'http://localhost:3000').pathname).toBe(right);
    }
  });

  test('an item hidden for now stays, not indexed, with similar items; a removed one answers 410', async ({ page, browser, request }) => {
    const away = await publishListing(browser, { title: `Hidden ${uniqueWord('cam')}`, categorySlug: 'projectors' });
    expect((await away.ownerRequest.post(`/api/v1/listings/${away.id}/hide`)).status()).toBe(200);
    const response = await page.goto(`/listings/${away.id}-${away.slug}`);
    expect(response?.status()).toBe(200);
    expect(await robots(page)).toBe('noindex, follow');
    await expect(page.getByText(en.item.away.badge)).toBeVisible();
    await expect(page.getByRole('heading', { name: en.item.similar })).toBeVisible();

    const gone = await publishListing(browser, { title: `Gone ${uniqueWord('tent')}` });
    expect((await gone.ownerRequest.delete(`/api/v1/listings/${gone.id}`)).status()).toBe(204);
    const answer = await request.get(`/listings/${gone.id}-${gone.slug}`, { maxRedirects: 0 });
    expect(answer.status()).toBe(410);
    expect(await answer.text()).toContain(en.item.gone.title);
  });
});

test.describe('category pages', () => {
  test('localized slugs, with the language alternates in the Link header; a foreign slug moves to this language’s', async ({ page, request }) => {
    const response = await page.goto('/lv/c/instrumenti');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Instrumenti' })).toBeVisible();
    expect(await canonical(page)).toBe(`${SITE}/lv/c/instrumenti`);
    const link = response?.headers()['link'] ?? '';
    expect(link).toContain(`<${SITE}/c/tools>; rel="alternate"; hreflang="en"`);
    expect(link).toContain(`<${SITE}/ru/c/instrumenty>; rel="alternate"; hreflang="ru"`);
    expect(link).toContain(`<${SITE}/c/tools>; rel="alternate"; hreflang="x-default"`);

    const foreign = await request.get('/lv/c/tools', { maxRedirects: 0 });
    expect([307, 308, 301]).toContain(foreign.status());
    expect(new URL(foreign.headers()['location']!, 'http://localhost:3000').pathname).toBe('/lv/c/instrumenti');
  });

  test('with 3 items it is indexed; fewer, it is noindex but followed', async ({ page }) => {
    await page.goto('/c/projectors');
    expect(await robots(page)).toBe('index, follow');
    await page.goto('/c/other');
    expect(await robots(page)).toBe('noindex, follow');
  });

  test('filters, sorts and the map point at the bare category and are not indexed; ?page=N alone is', async ({ page }) => {
    for (const query of ['?price_min=5', '?sort=price_asc', '?view=map', '?district=centrs&page=2']) {
      await page.goto(`/c/projectors${query}`);
      expect(await canonical(page), query).toBe(`${SITE}/c/projectors`);
      expect(await robots(page), query).toBe('noindex, follow');
    }
    await page.goto('/c/projectors?page=2');
    expect(await canonical(page)).toBe(`${SITE}/c/projectors?page=2`);
    expect(await robots(page)).toBe('index, follow');
  });

  test('search results are never indexed', async ({ page }) => {
    await page.goto('/search?q=projector');
    expect(await robots(page)).toBe('noindex, follow');
    expect(await canonical(page)).toBe(`${SITE}/search?q=projector`);
  });
});

test('a profile under any language points at the English one, with no hreflang', async ({ page }) => {
  const response = await page.goto(`/lv/u/${latvian.ownerId}`);
  expect(response?.status()).toBe(200);
  expect(await canonical(page)).toBe(`${SITE}/u/${latvian.ownerId}`);
  expect(await hreflangs(page)).toBe(0);
  expect(response?.headers()['link'] ?? '').not.toContain('hreflang');
});

test('the sitemaps list canonical item addresses and only categories with 3 items', async ({ request }) => {
  const listings = await (await request.get('/sitemap-listings.xml')).text();
  expect(listings).toContain(`<loc>${SITE}/lv/listings/${latvian.id}-${latvian.slug}</loc>`);
  expect(listings).not.toContain(`${SITE}/listings/${latvian.id}-`);
  expect(listings).not.toContain(`${SITE}/ru/listings/${latvian.id}-`);
  const categories = await (await request.get('/sitemap-categories.xml')).text();
  expect(categories).toContain(`<loc>${SITE}/c/projectors</loc>`);
  expect(categories).toContain(`<loc>${SITE}/lv/c/projektori-ekrani</loc>`);
  expect(categories).not.toContain('/c/other<');
});
