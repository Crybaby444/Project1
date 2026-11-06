import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { publishListing, uniqueWord, type Published } from './support/catalog';
import { serveBlankMapTiles } from './support/listings';

const m = en.catalog;
const item = en.item;

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

/** `YYYY-MM-DD` of today in Riga plus `days`. */
function dayFromToday(days: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga' }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The calendar button of a day, by the start of its accessible name ("Friday, November 13, 2026…"). */
function dayButton(page: Page, day: string) {
  const name = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
  return page.getByRole('button', { name: new RegExp(`^${name}`) });
}

/** Picks a period on the calendar, paging months forward as needed. */
async function pickPeriod(page: Page, start: string, end: string) {
  for (const day of [start, end]) {
    for (let i = 0; i < 3 && !(await dayButton(page, day).count()); i++) {
      await page.getByRole('button', { name: en.rangeCalendar.next }).first().click();
    }
    await dayButton(page, day).click();
  }
}

let drill: Published;
let word: string;

test.beforeAll(async ({ browser }) => {
  word = uniqueWord('drill');
  drill = await publishListing(browser, { title: `Cordless ${word} 18V` });
});

test('catalog → search with suggestions → filter → item → calculator → sign in to book', async ({ page }) => {
  await page.goto('/c');
  await expect(page.getByRole('heading', { level: 1, name: m.allTitle })).toBeVisible();

  // The combobox suggests the item while typing; Enter on the suggestion opens it, Enter on the text searches.
  const box = page.getByRole('combobox', { name: m.search.label });
  await box.fill(word);
  const suggestion = page.getByRole('option', { name: new RegExp(word) });
  await expect(suggestion).toBeVisible();
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  await box.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${word}`));
  await expect(page.getByRole('heading', { level: 1, name: `“${word}”` })).toBeVisible();
  await expect(page.getByRole('link', { name: drill.title })).toBeVisible();

  // A price filter goes to the address, in whole euros, and keeps the item (15 € a day).
  await page.getByLabel(m.filters.priceFrom).first().fill('10');
  await page.getByLabel(m.filters.priceTo).first().fill('20');
  await page.getByLabel(m.filters.priceTo).first().press('Enter');
  await expect(page).toHaveURL(/price_min=10/);
  await expect(page).toHaveURL(/price_max=20/);
  await expect(page.getByRole('button', { name: /€10–20 a day/ })).toBeVisible();
  await expect(page.getByRole('link', { name: drill.title })).toBeVisible();

  // Too cheap a range leaves nothing, with a way back.
  await page.getByLabel(m.filters.priceTo).first().fill('12');
  await page.getByLabel(m.filters.priceTo).first().press('Enter');
  await expect(page.getByRole('heading', { name: m.empty.title })).toBeVisible();
  await page.getByRole('button', { name: m.active.resetAll }).or(page.getByRole('link', { name: m.empty.reset })).first().click();
  await expect(page).not.toHaveURL(/price_max/);

  await page.getByRole('link', { name: drill.title }).click();
  await expect(page).toHaveURL(new RegExp(`/listings/${drill.id}-${drill.slug}$`));
  await expect(page.getByRole('heading', { level: 1, name: drill.title })).toBeVisible();
  await expect(page.getByText(item.booking.pickDates)).toBeVisible();

  // 7 days at 15 € with 10 % off for a week and Yoyo's 10 %: 94.50 + 9.45 + 50 deposit = 153.95.
  await pickPeriod(page, dayFromToday(2), dayFromToday(8));
  const breakdown = page.locator('dl').filter({ hasText: item.price.total });
  await expect(breakdown).toContainText('€15.00 × 7 days');
  await expect(breakdown).toContainText('−€10.50');
  await expect(breakdown).toContainText('€94.50');
  await expect(breakdown).toContainText('€9.45');
  await expect(breakdown).toContainText('€153.95');

  await page.getByRole('button', { name: item.booking.signInToRequest }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/listings/${drill.id}-${drill.slug}`)}`));
});

test('days the owner closed are struck through and cannot be picked; a renter requests other days', async ({ page, browser }) => {
  const listing = await publishListing(browser, { title: `Booked ${uniqueWord('saw')}` });
  const { listing: own } = (await (await listing.ownerRequest.get(`/api/v1/listings/${listing.id}`)).json()) as { listing: { version: number } };
  const closed = await listing.ownerRequest.put(`/api/v1/listings/${listing.id}/unavailability`, {
    data: { version: own.version, periods: [{ start: dayFromToday(4), end: dayFromToday(5) }] },
  });
  expect(closed.status(), await closed.text()).toBe(200);

  await registerByApi(page.request, { name: 'Līga Kalniņa' });
  await page.goto(`/listings/${listing.id}-${listing.slug}`);
  for (let i = 0; i < 2 && !(await dayButton(page, dayFromToday(4)).count()); i++) {
    await page.getByRole('button', { name: en.rangeCalendar.next }).first().click();
  }
  await expect(dayButton(page, dayFromToday(4))).toHaveAccessibleName(new RegExp(en.rangeCalendar.taken));
  await expect(dayButton(page, dayFromToday(4))).toHaveAttribute('aria-disabled', 'true');

  // A period cannot run across closed days: the later click starts a new period instead.
  await pickPeriod(page, dayFromToday(2), dayFromToday(7));
  await expect(page.getByText(item.booking.pickDates)).toBeVisible();

  await pickPeriod(page, dayFromToday(6), dayFromToday(8));
  await expect(page.locator('dl').filter({ hasText: item.price.total })).toContainText('€15.00 × 3 days');
  await page.getByLabel(item.booking.message).fill('Hi! I would pick it up in the morning.');
  await page.getByRole('button', { name: item.booking.request }).click();
  await expect(page.getByRole('status').filter({ hasText: item.booking.sentTitle })).toBeVisible();
});

test('the owner sees their own item without the booking button', async ({ browser }) => {
  const context = await browser.newContext();
  await asOwnVisitor(context);
  const page = await context.newPage();
  const cookies = await drill.ownerRequest.storageState();
  await context.addCookies(cookies.cookies);
  await page.goto(`/listings/${drill.id}-${drill.slug}`);
  await expect(page.getByText(item.booking.own)).toBeVisible();
  await expect(page.getByRole('button', { name: item.booking.request })).toHaveCount(0);
  await context.close();
});

test('the heart saves an item at once, and Favourites lists it', async ({ page }) => {
  await registerByApi(page.request);
  await page.goto(`/search?q=${word}`);
  const heart = page.getByRole('button', { name: en.favorites.add.replace('{title}', drill.title) });
  await heart.click();
  await expect(page.getByRole('button', { name: en.favorites.remove.replace('{title}', drill.title) })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /^Account menu/ }).click();
  await page.getByRole('menuitem', { name: en.header.favorites }).click();
  await expect(page.getByRole('heading', { level: 1, name: en.favorites.title })).toBeVisible();
  await expect(page.getByRole('link', { name: drill.title })).toBeVisible();
});

test('a visitor who presses the heart is asked to sign in and brought back', async ({ page }) => {
  await page.goto(`/search?q=${word}`);
  await page.getByRole('button', { name: en.favorites.add.replace('{title}', drill.title) }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fsearch/);
});

test('the map view shows the item in its district cell, never the exact point', async ({ page }) => {
  await serveBlankMapTiles(page);
  await page.goto(`/search?q=${word}&view=map`);
  await expect(page.getByRole('region', { name: m.map.label })).toBeVisible();
  await expect(page.getByText(m.map.approximate)).toBeVisible();
  const pin = page.locator('.yoyo-map-pin').first();
  await expect(pin).toBeVisible();
  await pin.click();
  await expect(page.getByRole('link', { name: drill.title }).last()).toBeVisible();
});

test('the owner’s public profile lists the item and has no reviews yet', async ({ page }) => {
  await page.goto(`/listings/${drill.id}-${drill.slug}`);
  await page.getByRole('link', { name: item.owner.profile.replace('{name}', 'Jānis Ozols') }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${drill.ownerId}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Jānis Ozols' })).toBeVisible();
  await expect(page.getByRole('link', { name: drill.title })).toBeVisible();
  await page.getByRole('tab', { name: en.profile.reviews }).click();
  await expect(page.getByRole('tabpanel').getByText(en.profile.noReviewsTitle, { exact: true })).toBeVisible();
});

test('the header’s Catalog menu links to every root category with plain links', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: en.header.catalog.button });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  // The links are in the page even while the panel is closed (for search engines).
  expect(await page.locator('nav[aria-label="Catalog categories"] a[href^="/c/"]').count()).toBeGreaterThan(13);
  await menu.click();
  const nav = page.getByRole('navigation', { name: en.header.catalog.label });
  await expect(nav.getByRole('link', { name: 'Tools', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await menu.click();
  await nav.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveURL(/\/c\/tools$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tools' })).toBeVisible();
});
