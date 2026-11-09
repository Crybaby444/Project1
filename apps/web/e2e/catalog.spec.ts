import { expect, test, type Page } from '@playwright/test';
import deals from '../messages/deals/en.json' with { type: 'json' };
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { publishListing, uniqueWord, type Published } from './support/catalog';
import { serveBlankMapTiles } from './support/listings';

const m = en.catalog;
const book = deals.booking;

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

/** The booking calendar's button of a day (plan 8b's picker marks each with `data-date`). */
const dayButton = (page: Page, day: string) => page.locator(`[data-booking-panel] [data-date="${day}"]`);

/** The panel loads the booking terms itself: wait for its calendar before paging it. */
const calendarReady = (page: Page) => expect(page.locator('[data-range-status]')).toBeVisible();

/** Picks a period on the booking calendar, paging months forward as needed. */
async function pickPeriod(page: Page, start: string, end: string) {
  await calendarReady(page);
  for (const day of [start, end]) {
    for (let i = 0; i < 3 && !(await dayButton(page, day).count()); i++) {
      await page.locator('[data-booking-panel]').getByRole('button', { name: book.calendar.next }).click();
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
  await expect(page.locator('[data-range-status]')).toHaveText(book.pickStart);

  // 7 days at 15 € with 10 % off for a week: 94.50 rent, the fee in force (10 % unless a launch offer
  // runs, from the booking terms) and the 50 € deposit, as the domain's quote computes it.
  await pickPeriod(page, dayFromToday(2), dayFromToday(8));
  await expect(page.locator('[data-range-status]')).toContainText('7 days');
  const terms = (await (await page.request.get(`/api/v1/listings/${drill.id}/booking-terms`)).json()) as { servicePercent: number };
  const fee = Math.round(9450 * terms.servicePercent / 100);
  await expect(page.locator('[data-total]')).toHaveText(`€${((9450 + fee + 5000) / 100).toFixed(2)}`);

  await page.getByRole('link', { name: book.signIn }).click();
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
  await calendarReady(page);
  for (let i = 0; i < 2 && !(await dayButton(page, dayFromToday(4)).count()); i++) {
    await page.locator('[data-booking-panel]').getByRole('button', { name: book.calendar.next }).click();
  }
  await expect(dayButton(page, dayFromToday(4))).toHaveAccessibleName(new RegExp(book.taken));
  await expect(dayButton(page, dayFromToday(4))).toHaveAttribute('aria-disabled', 'true');

  // A period across closed days has no price, and says why.
  await pickPeriod(page, dayFromToday(2), dayFromToday(7));
  await expect(page.getByText(book.crossesTaken)).toBeVisible();
  await expect(page.getByRole('button', { name: book.send })).toBeDisabled();

  await pickPeriod(page, dayFromToday(6), dayFromToday(8));
  await expect(page.locator('[data-range-status]')).toContainText('3 days');
  await page.getByLabel(book.message).fill('Hi! I would pick it up in the morning.');
  await page.getByRole('button', { name: book.send }).click();
  // The request is a deal now: its page opens.
  await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}$/);
});

test('the owner sees their own item without the booking button', async ({ browser }) => {
  const context = await browser.newContext();
  await asOwnVisitor(context);
  const page = await context.newPage();
  const cookies = await drill.ownerRequest.storageState();
  await context.addCookies(cookies.cookies);
  await page.goto(`/listings/${drill.id}-${drill.slug}`);
  await expect(page.getByText(book.own)).toBeVisible();
  await expect(page.getByRole('button', { name: book.send })).toHaveCount(0);
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
  await page.getByRole('link', { name: en.item.owner.profile.replace('{name}', 'Jānis Ozols') }).click();
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
