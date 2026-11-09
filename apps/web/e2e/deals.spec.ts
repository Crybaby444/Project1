import { expect, test } from '@playwright/test';
import { administrator, person, publishedListing, reloadDeal, returnedDealByApi, rigaDay, takeStep } from './support/deals';
import { fixture, serveBlankMapTiles } from './support/listings';

/**
 * The whole deal in two browsers (plan 8b, Task 9): the owner lists, the renter books, signs and pays
 * (a declined test card first), the item is handed over and returned, the deposit goes back, and the
 * money shows in both wallets with links to the deal.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test('owner lists, renter books, pays, handover, return, deposit released', async ({ browser, baseURL }) => {
  const admin = await administrator(browser, baseURL);
  const owner = await person(browser, baseURL, 'Andris Kalniņš');
  const renter = await person(browser, baseURL, 'Anna Bērziņa');
  await serveBlankMapTiles(owner.page);
  const title = `Camping tent ${Date.now()}`;
  const listingId = await publishedListing(owner.page, admin, title);

  // The renter picks today and tomorrow and sends a request; the price comes from the domain rules.
  const r = renter.page;
  await r.goto(`/items/${listingId}/book`);
  await expect(r.getByRole('heading', { level: 1, name: new RegExp(title, 'i') })).toBeVisible();
  await r.locator(`[data-date="${rigaDay(0)}"]`).click();
  await r.locator(`[data-date="${rigaDay(1)}"]`).click();
  await expect(r.locator('[data-range-status]')).toContainText('2 days');
  // 30 € rent + the service fee in force (from the settings, 10 % unless a launch offer runs) + 100 € deposit.
  const terms = (await (await r.request.get(`/api/v1/listings/${listingId}/booking-terms`)).json()) as { servicePercent: number };
  const total = `€${(30 + Math.round(30 * terms.servicePercent) / 100 + 100).toFixed(2)}`;
  await expect(r.locator('[data-total]')).toHaveText(total);
  await r.getByLabel('Message to the owner (optional)').fill('Could I pick it up after 18:00?');
  await r.getByRole('button', { name: 'Send request' }).click();
  await expect(r).toHaveURL(/\/bookings\/[^/]+$/);
  const dealUrl = new URL(r.url()).pathname;
  await expect(r.locator('[data-deal][data-deal-status="REQUESTED"]')).toBeVisible();
  await expect(r.locator('[aria-current="step"]')).toContainText('The request expires in');

  // The owner sees it waiting for them in My deals, opens it and accepts.
  const o = owner.page;
  await o.goto('/bookings?role=owner');
  await expect(o.getByRole('tab', { name: 'I lend' })).toHaveAccessibleDescription('1 waits for you');
  await o.getByRole('link', { name: new RegExp(title) }).click();
  await expect(o).toHaveURL(new RegExp(`${dealUrl}$`));
  await expect(o.getByText('Could I pick it up after 18:00?')).toBeVisible();
  await takeStep(o, 'Accept', false);
  await expect(o.locator('[data-deal][data-deal-status="ACCEPTED"]')).toBeVisible();
  await takeStep(o, 'Sign the contract', false);
  await expect(o.locator('[data-contract]')).toContainText('Signed');

  // The contract PDF downloads.
  const download = o.waitForEvent('download');
  await o.locator('[data-download-contract]').click();
  expect((await download).suggestedFilename()).toMatch(/^yoyo-contract-.+\.pdf$/);

  // The renter signs and pays: a declined card first, then a good one.
  await reloadDeal(r);
  await takeStep(r, 'Sign the contract', false);
  await r.getByRole('button', { name: 'Pay', exact: true }).click();
  const checkout = r.getByRole('dialog', { name: 'Pay for the booking' });
  await expect(checkout.getByRole('heading', { name: 'Test mode' })).toBeVisible();
  await checkout.getByRole('radio', { name: /Card/ }).check();
  await checkout.getByRole('button', { name: /Use: 4000 0000 0000 0002/ }).click();
  await checkout.getByRole('button', { name: `Pay ${total}` }).click();
  await expect(checkout.getByRole('alert')).toContainText('The bank declined this card');
  await checkout.getByRole('button', { name: /Use: 4242 4242 4242 4242/ }).click();
  await checkout.getByRole('button', { name: `Pay ${total}` }).click();
  await expect(checkout).toHaveCount(0);
  await expect(r.locator('[data-deal][data-deal-status="PAID"]')).toBeVisible();
  await expect(r.locator('[data-deposit-state="frozen"]')).toBeVisible();

  // Handover: the owner marks it, the renter confirms.
  await reloadDeal(o);
  await takeStep(o, 'I handed it over');
  await reloadDeal(r);
  await takeStep(r, 'I received it');
  await expect(r.locator('[data-deal][data-deal-status="ACTIVE"]')).toBeVisible();

  // Return: the renter marks it, the owner confirms and finds all fine.
  await takeStep(r, 'I returned it');
  await reloadDeal(o);
  await takeStep(o, 'I got it back');
  await expect(o.locator('[data-deal][data-deal-status="RETURNED"]')).toBeVisible();
  await expect(o.locator('[aria-current="step"]')).toContainText('Deposit goes back automatically in');
  await takeStep(o, 'All fine, return the deposit');
  await expect(o.locator('[data-deal][data-deal-status="COMPLETED"]')).toBeVisible();

  // The deposit went back to the renter's card; the owner earned the rent.
  await reloadDeal(r);
  await expect(r.locator('[data-deposit-state="refunded"]')).toBeVisible();
  await expect(r.locator('[data-step="end"]')).toHaveAttribute('data-state', 'done');
  await o.goto('/wallet');
  await expect(o.locator('[data-tile="earned"]')).toContainText('€30.00');
  const rent = o.locator('[data-ledger-kind="RENT_RELEASE"]');
  await expect(rent).toContainText('+€30.00');
  await rent.getByRole('link', { name: `Deal: ${title}` }).click();
  await expect(o).toHaveURL(new RegExp(`${dealUrl}$`));

  // Closed deals are in their group.
  await r.goto('/bookings?group=closed');
  await expect(r.getByRole('link', { name: new RegExp(title) })).toBeVisible();
});

test('damage claimed with a photo, rejected by the renter, decided by Yoyo', async ({ browser, baseURL }) => {
  const admin = await administrator(browser, baseURL);
  const owner = await person(browser, baseURL, 'Andris Kalniņš');
  const renter = await person(browser, baseURL, 'Anna Bērziņa');
  const title = `Drone ${Date.now()}`;
  const listingId = await publishedListing(owner.page, admin, title);
  const id = await returnedDealByApi(renter.page.request, owner.page.request, listingId);

  // The owner reports damage with a photo.
  const o = owner.page;
  await o.goto(`/bookings/${id}`);
  await o.getByRole('button', { name: 'Report damage' }).click();
  const report = o.getByRole('dialog', { name: 'Report damage' });
  await report.getByLabel('What is damaged').fill('One propeller is cracked along its edge.');
  await report.locator('input[type="file"]').setInputFiles(fixture('item.jpg'));
  await expect(report.getByRole('img', { name: /Photo 1 of the item/ })).toBeVisible();
  await report.getByRole('button', { name: 'Send' }).click();
  await expect(o.locator('[data-deal][data-deal-status="DAMAGE_CLAIMED"]')).toBeVisible();

  // The renter disagrees: a dispute for Yoyo.
  const r = renter.page;
  await r.goto(`/bookings/${id}`);
  await expect(r.getByText('One propeller is cracked along its edge.')).toBeVisible();
  await r.getByRole('button', { name: 'Disagree, ask Yoyo' }).click();
  const reject = r.getByRole('dialog', { name: 'Disagree with the damage claim' });
  await reject.getByLabel('What happened').fill('It was cracked when I got it.');
  await reject.getByRole('button', { name: 'Send' }).click();
  await expect(r.locator('[data-deal][data-deal-status="DISPUTED"]')).toBeVisible();
  await expect(r.locator('[data-dispute]')).toContainText('An administrator will decide');
  await expect(r.locator('[data-deposit-state="frozen"]')).toBeVisible();

  // An administrator decides (the admin screens are plan 11); both sides see the decision.
  const { booking } = (await (await admin.get(`/api/v1/bookings/${id}`)).json()) as { booking: { version: number } };
  const resolved = await admin.post(`/api/v1/admin/bookings/${id}/resolve`, {
    headers: { 'Idempotency-Key': `e2e-resolve-${id}` },
    data: { version: booking.version, decision: 'REFUND_DEPOSIT', comment: 'The handover photos show the crack.' },
  });
  expect(resolved.status(), await resolved.text()).toBe(200);
  await reloadDeal(o);
  await expect(o.locator('[data-resolution="REFUND_DEPOSIT"]')).toBeVisible();
  await expect(o.getByText('The handover photos show the crack.')).toBeVisible();
  await reloadDeal(r);
  await expect(r.locator('[data-deal][data-deal-status="COMPLETED"]')).toBeVisible();
  await expect(r.locator('[data-deposit-state="refunded"]')).toBeVisible();
  await r.goto('/wallet');
  await expect(r.locator('[data-ledger-kind="DEPOSIT_REFUND"]')).toContainText('+€100.00');
});

test('a deal that is not yours does not exist', async ({ browser, baseURL }) => {
  const admin = await administrator(browser, baseURL);
  const owner = await person(browser, baseURL, 'Andris Kalniņš');
  const renter = await person(browser, baseURL, 'Anna Bērziņa');
  const stranger = await person(browser, baseURL, 'Pēteris Ozols');
  const listingId = await publishedListing(owner.page, admin, `Kayak ${Date.now()}`);
  const res = await renter.page.request.post('/api/v1/bookings', { data: { listingId, start: rigaDay(2), end: rigaDay(3) } });
  const { booking } = (await res.json()) as { booking: { id: string } };
  await stranger.page.goto(`/bookings/${booking.id}`);
  await expect(stranger.page.getByRole('heading', { name: 'Deal not found' })).toBeVisible();
  await expect(stranger.page.locator('[data-action]')).toHaveCount(0);
});
