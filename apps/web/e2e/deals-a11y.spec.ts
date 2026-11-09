import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { administrator, person, publishedListing, returnedDealByApi, stepByApi, topUpByApi, rigaDay } from './support/deals';
import { overflows } from './support/layout';

/**
 * The deal and wallet screens (plan 8b, Task 9): no serious or critical axe issues in either theme,
 * nothing sticking out at 320 and 390 px in EN, LV and RU, and nothing moving under reduced motion.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

async function noSeriousIssues(page: Page, what: string) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${what}: ${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
  expect.soft(serious).toEqual([]);
}

test('deal, lists, wallet, booking and checkout: accessible in both themes, fit phones in three languages', async ({ browser, baseURL }) => {
  const admin = await administrator(browser, baseURL);
  const owner = await person(browser, baseURL, 'Andris Kalniņš');
  const renter = await person(browser, baseURL, 'Anna Bērziņa');
  const listingId = await publishedListing(owner.page, admin, `Stand-up paddle board ${Date.now()}`);
  // One deal back with the owner (the longest page: a full timeline, photos, the frozen deposit) and
  // one waiting for payment (checkout).
  const disputed = await returnedDealByApi(renter.page.request, owner.page.request, listingId);
  const res = await renter.page.request.post('/api/v1/bookings', { data: { listingId, start: rigaDay(5), end: rigaDay(6) } });
  const { booking } = (await res.json()) as { booking: { id: string } };
  await stepByApi(owner.page.request, booking.id, { type: 'ACCEPT' });
  await stepByApi(owner.page.request, booking.id, { type: 'SIGN' });
  await stepByApi(renter.page.request, booking.id, { type: 'SIGN' });
  await topUpByApi(renter.page.request, 1_000);

  const page = renter.page;
  const screens = [
    { path: `/bookings/${disputed}`, ready: '[data-deal]' },
    { path: `/bookings/${booking.id}`, ready: '[data-deal]' },
    { path: '/bookings', ready: '[data-deal-card]' },
    { path: '/wallet', ready: '[data-ledger]' },
    { path: `/items/${listingId}/book`, ready: '[data-booking-panel]' },
  ];

  for (const theme of ['light', 'dark'] as const) {
    await page.request.patch('/api/v1/me', { data: { theme } });
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(page.locator(screen.ready).first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await noSeriousIssues(page, `${screen.path} ${theme}`);
    }
    // The checkout with the card form open.
    await page.goto(`/bookings/${booking.id}`);
    await page.getByRole('button', { name: 'Pay', exact: true }).click();
    await page.getByRole('dialog').getByRole('radio', { name: /Card/ }).check();
    await expect(page.locator('[data-test-mode]')).toBeVisible();
    await noSeriousIssues(page, `checkout ${theme}`);
  }

  for (const [locale, prefix] of [['en', ''], ['lv', '/lv'], ['ru', '/ru']] as const) {
    await page.request.patch('/api/v1/me', { data: { locale } });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      for (const screen of screens) {
        await page.goto(`${prefix}${screen.path}`);
        await expect(page.locator(screen.ready).first()).toBeVisible();
        expect.soft(await overflows(page), `${screen.path} at ${width}px (${locale})`).toEqual([]);
      }
    }
  }
});

test.describe('with reduced motion', () => {
  test('the timeline, tiles and dialogs are still', async ({ browser, baseURL }) => {
    const admin = await administrator(browser, baseURL);
    const owner = await person(browser, baseURL, 'Andris Kalniņš');
    const renter = await person(browser, baseURL, 'Anna Bērziņa');
    const listingId = await publishedListing(owner.page, admin, `Ladder ${Date.now()}`);
    const id = await returnedDealByApi(renter.page.request, owner.page.request, listingId);
    const context = await browser.newContext({ baseURL, reducedMotion: 'reduce', storageState: await renter.context.storageState() });
    const page = await context.newPage();
    await page.goto(`/bookings/${id}`);
    await expect(page.locator('[data-deal]')).toBeVisible();
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    expect(moving).toBe(0);
    await page.goto('/wallet');
    await expect(page.locator('[data-tile="available"]')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  });
});
