import { expect, test, type Page } from '@playwright/test';
import deals from '../messages/deals/en.json' with { type: 'json' };
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { publishListing, uniqueWord, type Published } from './support/catalog';

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

/**
 * Pages the booking calendar to the month of `day`, back or forward. Forward only failed near a month's
 * end: on 27 Nov the test paged on to December to see day +4, then could not find day +2 (29 Nov).
 */
async function showMonthOf(page: Page, day: string) {
  const panel = page.locator('[data-booking-panel]');
  for (let i = 0; i < 6 && !(await dayButton(page, day).count()); i++) {
    const shown = await panel.locator('[data-date]').evaluateAll((days) => days.map((d) => d.getAttribute('data-date') ?? '').sort());
    const back = shown.length > 0 && day < shown[0]!;
    await panel.getByRole('button', { name: back ? book.calendar.previous : book.calendar.next }).click();
  }
}

/** Picks a period on the booking calendar, paging to each day's month. */
async function pickPeriod(page: Page, start: string, end: string) {
  await calendarReady(page);
  for (const day of [start, end]) {
    await showMonthOf(page, day);
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

  // The header's combobox (the site's one search) suggests the item while typing; Enter on the text searches.
  const box = page.getByRole('banner').getByRole('combobox', { name: en.nav.search });
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

  // Too cheap a range leaves nothing, with a way back, and what is new in the catalog meanwhile.
  await page.getByLabel(m.filters.priceTo).first().fill('12');
  await page.getByLabel(m.filters.priceTo).first().press('Enter');
  await expect(page.getByRole('heading', { name: m.empty.title })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: m.freshInstead })).toBeVisible();
  await page.getByRole('button', { name: m.active.resetAll }).or(page.getByRole('link', { name: m.empty.reset })).first().click();
  await expect(page).not.toHaveURL(/price_max/);

  await page.getByRole('link', { name: drill.title }).click();
  await expect(page).toHaveURL(new RegExp(`/listings/${drill.id}-${drill.slug}$`));
  // The rules every rental keeps sit under the item (2026-11-16).
  await expect(page.getByRole('heading', { level: 2, name: /^Renting .+ on Yoyo$/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: drill.title })).toBeVisible();
  await expect(page.locator('[data-range-status]')).toHaveText(book.pickStart);

  // 7 days at 15 € with 10 % off for a week: 94.50 rent, the fee in force (10 %: the specs turn a new account's
  // free month off; from the booking terms) and the 50 € deposit, as the domain's quote computes it.
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
  await showMonthOf(page, dayFromToday(4));
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

  // Reaching the heart scrolled the page down and the bar stepped away; on the way up it comes back.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: /^Account menu/ }).click();
  // Favourites live in My profile (owner, 2026-11-16).
  await page.getByRole('menuitem', { name: en.mySpace.menu }).click();
  await page.getByRole('tab', { name: en.profile.favorites }).click();
  await expect(page.getByRole('tabpanel').getByRole('link', { name: drill.title })).toBeVisible();
});

test('a visitor who presses the heart is asked to sign in and brought back', async ({ page }) => {
  await page.goto(`/search?q=${word}`);
  await page.getByRole('button', { name: en.favorites.add.replace('{title}', drill.title) }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fsearch/);
});

test('the owner’s public profile lists the item and has no reviews yet', async ({ page }) => {
  await page.goto(`/listings/${drill.id}-${drill.slug}`);
  await page.getByRole('link', { name: /^More from @janis\./ }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${drill.ownerId}$`));
  await expect(page.getByRole('heading', { level: 1, name: /^@janis\./ })).toBeVisible();
  await expect(page.getByRole('link', { name: drill.title })).toBeVisible();
  await page.getByRole('tab', { name: en.profile.reviews }).click();
  await expect(page.getByRole('tabpanel').getByText(en.profile.noReviewsTitle, { exact: true })).toBeVisible();
});

test('the catalog is reached from the header, not the footer (owner, 2026-11-16)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Catalog' })).toHaveCount(0);
  await page.getByRole('banner').getByRole('button', { name: 'Catalog' }).click();
  await page.getByRole('link', { name: en.nav.allCategoriesPage }).click();
  await expect(page).toHaveURL(/\/c$/);
  // Every root category is a plain link on /c (for search engines and the keyboard).
  expect(await page.getByRole('main').locator('a[href^="/c/"]').count()).toBeGreaterThanOrEqual(13);
  await page.getByRole('main').locator('a[href="/c/tools"]').first().click();
  await expect(page).toHaveURL(/\/c\/tools$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tools' })).toBeVisible();
});
